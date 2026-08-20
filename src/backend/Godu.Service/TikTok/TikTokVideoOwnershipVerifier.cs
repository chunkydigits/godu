using Godu.Model.Documents;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Service.PlatformAccounts;
using Microsoft.Extensions.Logging;

namespace Godu.Service.TikTok;

public sealed class TikTokVideoOwnershipVerifier : ITikTokVideoOwnershipVerifier
{
    private readonly ITikTokOAuthClient _oauth;
    private readonly IPlatformTokenProtector _tokens;
    private readonly ILinkedPlatformAccountRepository _accounts;
    private readonly ILogger<TikTokVideoOwnershipVerifier> _logger;

    public TikTokVideoOwnershipVerifier(
        ITikTokOAuthClient oauth,
        IPlatformTokenProtector tokens,
        ILinkedPlatformAccountRepository accounts,
        ILogger<TikTokVideoOwnershipVerifier> logger)
    {
        _oauth = oauth;
        _tokens = tokens;
        _accounts = accounts;
        _logger = logger;
    }

    public async Task<bool> OwnsVideoAsync(
        LinkedPlatformAccountDocument account,
        string externalVideoId,
        CancellationToken cancellationToken = default)
    {
        var accessToken = await ResolveAccessTokenAsync(account, cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(externalVideoId))
        {
            return false;
        }

        try
        {
            return await _oauth
                .UserOwnsVideoAsync(accessToken, externalVideoId, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "TikTok ownership query failed for account {AccountId}; trying a token refresh.",
                account.Id);
        }

        var refreshed = await TryRefreshAsync(account, cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(refreshed))
        {
            return false;
        }

        return await _oauth
            .UserOwnsVideoAsync(refreshed, externalVideoId, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<string?> ResolveAccessTokenAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(account.EncryptedAccessToken))
        {
            return await TryRefreshAsync(account, cancellationToken).ConfigureAwait(false);
        }

        try
        {
            var access = _tokens.Unprotect(account.EncryptedAccessToken);
            if (account.AccessTokenExpiresUtc is { } expiry
                && expiry <= DateTime.UtcNow.AddMinutes(1))
            {
                return await TryRefreshAsync(account, cancellationToken).ConfigureAwait(false)
                    ?? access;
            }

            return access;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not unprotect TikTok access token for {AccountId}.", account.Id);
            return await TryRefreshAsync(account, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task<string?> TryRefreshAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(account.EncryptedRefreshToken))
        {
            return null;
        }

        string refreshToken;
        try
        {
            refreshToken = _tokens.Unprotect(account.EncryptedRefreshToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not unprotect TikTok refresh token for {AccountId}.", account.Id);
            return null;
        }

        var tokens = await _oauth.RefreshAsync(refreshToken, cancellationToken).ConfigureAwait(false);
        var now = DateTime.UtcNow;
        account.EncryptedAccessToken = _tokens.Protect(tokens.AccessToken);
        if (!string.IsNullOrWhiteSpace(tokens.RefreshToken))
        {
            account.EncryptedRefreshToken = _tokens.Protect(tokens.RefreshToken);
        }

        account.AccessTokenExpiresUtc = tokens.ExpiresInSeconds > 0
            ? now.AddSeconds(tokens.ExpiresInSeconds)
            : null;
        if (tokens.RefreshExpiresInSeconds > 0)
        {
            account.RefreshTokenExpiresUtc = now.AddSeconds(tokens.RefreshExpiresInSeconds);
        }

        account.UpdatedUtc = now;
        await _accounts.UpdateAsync(account, cancellationToken).ConfigureAwait(false);
        return tokens.AccessToken;
    }
}
