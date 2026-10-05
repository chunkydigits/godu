using Godu.Model.Requests;
using Godu.Model.Responses;

namespace Godu.Service.Creators;

public interface ICreatorProfileService
{
    Task<CreatorProfileResponse> GetPublicAsync(string userId, CancellationToken cancellationToken = default);

    Task<CreatorProfileResponse> GetPublicByHandleAsync(
        string providerAlias,
        string username,
        CancellationToken cancellationToken = default);

    Task<CreatorProfileResponse> GetMineAsync(CancellationToken cancellationToken = default);

    Task<CreatorProfileResponse> UpdateMineAsync(
        UpdateCreatorProfileRequest request,
        CancellationToken cancellationToken = default);

    Task<CreatorProfileResponse> ImportMineFromSocialAsync(CancellationToken cancellationToken = default);

    Task<ProfileLinkResponse> AddLinkAsync(CreateProfileLinkRequest request, CancellationToken cancellationToken = default);
    Task<ProfileLinkResponse> UpdateLinkAsync(string linkId, CreateProfileLinkRequest request, CancellationToken cancellationToken = default);
    Task DeleteLinkAsync(string linkId, CancellationToken cancellationToken = default);
    Task ReorderLinksAsync(UpdateProfileLinkOrderRequest request, CancellationToken cancellationToken = default);
}
