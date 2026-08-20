using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Responses;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Godu.Service.TikTok;
using Godu.Utility;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Godu.Service.PlatformAccounts;

public sealed class LinkedPlatformAccountService : ILinkedPlatformAccountService
{
    private readonly ILinkedPlatformAccountRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly ITikTokOAuthClient _tikTokOAuth;
    private readonly IPlatformOAuthStateStore _oauthState;
    private readonly IPlatformTokenProtector _tokenProtector;
    private readonly ITikTokAccessTokenResolver _accessTokens;
    private readonly TikTokOptions _tikTok;
    private readonly ILogger<LinkedPlatformAccountService> _logger;

    public LinkedPlatformAccountService(
        ILinkedPlatformAccountRepository repository,
        ICurrentUser currentUser,
        ITikTokOAuthClient tikTokOAuth,
        IPlatformOAuthStateStore oauthState,
        IPlatformTokenProtector tokenProtector,
        ITikTokAccessTokenResolver accessTokens,
        IOptions<TikTokOptions> tikTokOptions,
        ILogger<LinkedPlatformAccountService> logger)
    {
        _repository = repository;
        _currentUser = currentUser;
        _tikTokOAuth = tikTokOAuth;
        _oauthState = oauthState;
        _tokenProtector = tokenProtector;
        _accessTokens = accessTokens;
        _tikTok = tikTokOptions.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LinkedPlatformAccountResponse>> ListMineAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var accounts = await _repository
            .ListByUserAsync(userId, cancellationToken)
            .ConfigureAwait(false);
        return accounts.Select(LinkedPlatformAccountMapper.ToResponse).ToList();
    }

    public Task<PlatformConnectStartResponse> StartConnectAsync(
        string provider,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        if (!ProviderUtilities.TryCanonicalise(provider, out var canonical) || canonical != "tiktok")
        {
            throw new ArgumentException("Only TikTok account linking is available.");
        }

        if (!_tikTok.IsConfigured)
        {
            throw new InvalidOperationException(
                "TikTok Login Kit is not configured. Set TikTok:ClientKey and TikTok:ClientSecret.");
        }

        var state = _oauthState.Create(userId);
        var url = BuildAuthorizeUrl(state);
        return Task.FromResult(new PlatformConnectStartResponse
        {
            Provider = canonical,
            AuthorizationUrl = url,
        });
    }

    public async Task<string> CompleteConnectFromCallbackAsync(
        string provider,
        string? code,
        string? state,
        string? error,
        CancellationToken cancellationToken = default)
    {
        if (!ProviderUtilities.TryCanonicalise(provider, out var canonical) || canonical != "tiktok")
        {
            return FrontendReturn("error=invalid");
        }

        if (!string.IsNullOrWhiteSpace(error))
        {
            return FrontendReturn("error=denied");
        }

        if (string.IsNullOrWhiteSpace(code)
            || string.IsNullOrWhiteSpace(state)
            || !_oauthState.TryConsume(state, out var userId))
        {
            return FrontendReturn("error=invalid");
        }

        try
        {
            var tokens = await _tikTokOAuth
                .ExchangeCodeAsync(code, _tikTok.RedirectUri, cancellationToken)
                .ConfigureAwait(false);

            var profile = await _tikTokOAuth
                .GetUserInfoAsync(tokens.AccessToken, cancellationToken)
                .ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(profile.Username))
            {
                throw new InvalidOperationException(
                    "TikTok did not return a username. Ensure user.info.profile is approved.");
            }

            var openId = string.IsNullOrWhiteSpace(profile.OpenId) ? tokens.OpenId : profile.OpenId;
            await UpsertVerifiedTikTokAsync(userId, openId, profile, tokens, cancellationToken)
                .ConfigureAwait(false);

            return FrontendReturn("linked=tiktok");
        }
        catch (PlatformAccountAlreadyLinkedException)
        {
            return FrontendReturn("error=conflict");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TikTok platform connect failed for user {UserId}.", userId);
            return FrontendReturn("error=failed");
        }
    }

    public async Task DisconnectAsync(string id, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var existing = await _repository
            .GetByIdAsync(id, userId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is null)
        {
            throw new KeyNotFoundException("Linked platform account not found.");
        }

        if (!string.IsNullOrWhiteSpace(existing.EncryptedAccessToken))
        {
            try
            {
                var accessToken = _tokenProtector.Unprotect(existing.EncryptedAccessToken);
                await _tikTokOAuth.RevokeAsync(accessToken, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "TikTok token revoke failed for {Id}; disconnecting anyway.", id);
            }
        }

        await _repository.DeleteAsync(id, userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<LinkedPlatformAccountResponse> RefreshVerifiedMetadataAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var accounts = await _repository.ListByUserAsync(userId, cancellationToken).ConfigureAwait(false);
        var account = accounts.FirstOrDefault(item => item.IsVerified)
            ?? throw new InvalidOperationException("Connect a verified creator account first.");

        var profile = await FetchLiveUserInfoAsync(account, cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(profile.Username))
        {
            throw new InvalidOperationException(
                "TikTok did not return a username. Reconnect the account and try again.");
        }

        ApplyLiveProfile(account, profile);
        account.UpdatedUtc = DateTime.UtcNow;
        var updated = await _repository.UpdateAsync(account, cancellationToken).ConfigureAwait(false);
        return LinkedPlatformAccountMapper.ToResponse(updated);
    }

    private async Task<TikTokUserInfo> FetchLiveUserInfoAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken)
    {
        var accessToken = await _accessTokens
            .ResolveAccessTokenAsync(account, cancellationToken)
            .ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            throw new InvalidOperationException("Could not reach TikTok. Reconnect the account and try again.");
        }

        try
        {
            return await _tikTokOAuth.GetUserInfoAsync(accessToken, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "TikTok user info failed for {AccountId}; trying a token refresh.",
                account.Id);
        }

        var refreshed = await _accessTokens
            .TryRefreshAsync(account, cancellationToken)
            .ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(refreshed))
        {
            throw new InvalidOperationException("Could not reach TikTok. Reconnect the account and try again.");
        }

        return await _tikTokOAuth.GetUserInfoAsync(refreshed, cancellationToken).ConfigureAwait(false);
    }

    private static void ApplyLiveProfile(LinkedPlatformAccountDocument account, TikTokUserInfo profile)
    {
        var username = profile.Username!.Trim().ToLowerInvariant();
        if (!string.Equals(account.Username, username, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(account.Username)
            && !account.UsernameAliases.Contains(account.Username, StringComparer.OrdinalIgnoreCase))
        {
            account.UsernameAliases.Add(account.Username);
        }

        account.Username = username;
        account.DisplayName = profile.DisplayName;
        account.ProfileUrl = BuildProfileUrl(username);
        account.AvatarUrl = profile.AvatarUrl;
        account.Bio = profile.Bio;
    }

    private async Task UpsertVerifiedTikTokAsync(
        string userId,
        string openId,
        TikTokUserInfo profile,
        TikTokTokenResult tokens,
        CancellationToken cancellationToken)
    {
        var username = profile.Username!.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var existing = await _repository
            .GetByProviderAndExternalIdAsync("tiktok", openId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null && !string.Equals(existing.UserId, userId, StringComparison.Ordinal))
        {
            throw new PlatformAccountAlreadyLinkedException();
        }

        var encryptedAccess = _tokenProtector.Protect(tokens.AccessToken);
        var encryptedRefresh = string.IsNullOrWhiteSpace(tokens.RefreshToken)
            ? null
            : _tokenProtector.Protect(tokens.RefreshToken);

        if (existing is null)
        {
            var created = new LinkedPlatformAccountDocument
            {
                Id = IdGenerator.NewPlatformAccountId(),
                UserId = userId,
                Provider = "tiktok",
                ExternalAccountId = openId,
                Username = username,
                DisplayName = profile.DisplayName,
                ProfileUrl = BuildProfileUrl(username),
                AvatarUrl = profile.AvatarUrl,
                Bio = profile.Bio,
                UsernameAliases = [],
                IsVerified = true,
                VerifiedUtc = now,
                CreatedUtc = now,
                UpdatedUtc = now,
                EncryptedAccessToken = encryptedAccess,
                EncryptedRefreshToken = encryptedRefresh,
                AccessTokenExpiresUtc = ExpiresAt(now, tokens.ExpiresInSeconds),
                RefreshTokenExpiresUtc = ExpiresAt(now, tokens.RefreshExpiresInSeconds),
                Scope = tokens.Scope,
            };

            await _repository.CreateAsync(created, cancellationToken).ConfigureAwait(false);
            return;
        }

        if (!string.Equals(existing.Username, username, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(existing.Username)
            && !existing.UsernameAliases.Contains(existing.Username, StringComparer.OrdinalIgnoreCase))
        {
            existing.UsernameAliases.Add(existing.Username);
        }

        existing.Username = username;
        existing.DisplayName = profile.DisplayName;
        existing.ProfileUrl = BuildProfileUrl(username);
        existing.AvatarUrl = profile.AvatarUrl;
        existing.Bio = profile.Bio;
        existing.IsVerified = true;
        existing.VerifiedUtc ??= now;
        existing.UpdatedUtc = now;
        existing.EncryptedAccessToken = encryptedAccess;
        existing.EncryptedRefreshToken = encryptedRefresh;
        existing.AccessTokenExpiresUtc = ExpiresAt(now, tokens.ExpiresInSeconds);
        existing.RefreshTokenExpiresUtc = ExpiresAt(now, tokens.RefreshExpiresInSeconds);
        existing.Scope = tokens.Scope;

        await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
    }

    private string BuildAuthorizeUrl(string state)
    {
        return string.Concat(
            _tikTok.AuthorizeUrl.TrimEnd('?'),
            "?client_key=",
            Uri.EscapeDataString(_tikTok.ClientKey),
            "&response_type=code",
            "&scope=",
            Uri.EscapeDataString(_tikTok.Scopes),
            "&redirect_uri=",
            Uri.EscapeDataString(_tikTok.RedirectUri),
            "&state=",
            Uri.EscapeDataString(state));
    }

    private string FrontendReturn(string query)
    {
        var baseUrl = _tikTok.FrontendReturnUrl.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return $"/settings?{query}";
        }

        var separator = baseUrl.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        return $"{baseUrl}{separator}{query}";
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private static string BuildProfileUrl(string username) => $"https://www.tiktok.com/@{username}";

    private static DateTime? ExpiresAt(DateTime now, int seconds) =>
        seconds > 0 ? now.AddSeconds(seconds) : null;
}
