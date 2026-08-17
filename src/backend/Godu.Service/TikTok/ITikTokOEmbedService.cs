using Godu.Model.Responses;

namespace Godu.Service.TikTok;

public interface ITikTokOEmbedService
{
    Task<TikTokVideoMetadataResponse?> LookupAsync(
        string videoUrlOrId,
        CancellationToken cancellationToken = default);
}
