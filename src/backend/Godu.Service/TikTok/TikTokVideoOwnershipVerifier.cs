using Godu.Model.Documents;
using Microsoft.Extensions.Logging;

namespace Godu.Service.TikTok;

public sealed class TikTokVideoOwnershipVerifier : ITikTokVideoOwnershipVerifier
{
    private readonly ITikTokOAuthClient _oauth;
    private readonly ITikTokAccessTokenResolver _tokens;
    private readonly ILogger<TikTokVideoOwnershipVerifier> _logger;

    public TikTokVideoOwnershipVerifier(
        ITikTokOAuthClient oauth,
        ITikTokAccessTokenResolver tokens,
        ILogger<TikTokVideoOwnershipVerifier> logger)
    {
        _oauth = oauth;
        _tokens = tokens;
        _logger = logger;
    }

    public async Task<bool> OwnsVideoAsync(
        LinkedPlatformAccountDocument account,
        string externalVideoId,
        CancellationToken cancellationToken = default)
    {
        var accessToken = await _tokens
            .ResolveAccessTokenAsync(account, cancellationToken)
            .ConfigureAwait(false);
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

        var refreshed = await _tokens.TryRefreshAsync(account, cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(refreshed))
        {
            return false;
        }

        return await _oauth
            .UserOwnsVideoAsync(refreshed, externalVideoId, cancellationToken)
            .ConfigureAwait(false);
    }
}
