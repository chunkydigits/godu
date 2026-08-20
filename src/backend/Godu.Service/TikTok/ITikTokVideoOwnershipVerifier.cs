using Godu.Model.Documents;

namespace Godu.Service.TikTok;

public interface ITikTokVideoOwnershipVerifier
{
    Task<bool> OwnsVideoAsync(
        LinkedPlatformAccountDocument account,
        string externalVideoId,
        CancellationToken cancellationToken = default);
}
