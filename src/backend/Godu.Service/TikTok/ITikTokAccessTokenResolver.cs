using Godu.Model.Documents;

namespace Godu.Service.TikTok;

public interface ITikTokAccessTokenResolver
{
    Task<string?> ResolveAccessTokenAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default);

    Task<string?> TryRefreshAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default);
}
