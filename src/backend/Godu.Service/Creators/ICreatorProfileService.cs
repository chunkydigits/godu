using Godu.Model.Responses;

namespace Godu.Service.Creators;

public interface ICreatorProfileService
{
    Task<CreatorProfileResponse> GetPublicAsync(string userId, CancellationToken cancellationToken = default);

    Task<CreatorProfileResponse> GetPublicByHandleAsync(
        string providerAlias,
        string username,
        CancellationToken cancellationToken = default);
}
