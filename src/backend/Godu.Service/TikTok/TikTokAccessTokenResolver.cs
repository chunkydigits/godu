using Godu.Model.Documents;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Service.PlatformAccounts;
using Microsoft.Extensions.Logging;

namespace Godu.Service.TikTok;

public sealed class TikTokAccessTokenResolver : ITikTokAccessTokenResolver
{
    private readonly ITikTokOAuthClient _oauth;
    private readonly IPlatformTokenProtector _tokens;
    private readonly ILinkedPlatformAccountRepository _accounts;
    private readonly ILogger<TikTokAccessTokenResolver> _logger;

    public TikTokAccessTokenResolver(
        ITikTokOAuthClient oauth,
        IPlatformTokenProtector tokens,
        ILinkedPlatformAccountRepository accounts,
        ILogger<TikTokAccessTokenResolver> logger)
    {
        _oauth = oauth;
        _tokens = tokens;
        _accounts = accounts;
        _logger = logger;
    }

    public async Task<string?> ResolveAccessTokenAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
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

    public async Task<string?> TryRefreshAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
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
