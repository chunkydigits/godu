using Godu.Model.Requests;
using Godu.Model.Responses;

namespace Godu.Service.StepsItems;

public interface IStepsItemService
{
    Task<IReadOnlyList<StepsItemResponse>> ListMineAsync(
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<StepsItemResponse> GetMineAsync(string id, CancellationToken cancellationToken = default);

    Task<StepsItemResponse> CreateMineAsync(
        CreateStepsItemRequest request,
        CancellationToken cancellationToken = default);

    Task<StepsItemResponse> UpdateMineAsync(
        string id,
        UpdateStepsItemRequest request,
        CancellationToken cancellationToken = default);

    Task<StepsItemResponse> ArchiveMineAsync(string id, CancellationToken cancellationToken = default);

    Task<StepsItemResponse?> GetPublicAsync(
        string providerAlias,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemResponse>> ListPublicByUsernameAsync(
        string providerAlias,
        string platformUsername,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemResponse>> ListRelatedPublicAsync(
        string providerAlias,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemResponse>> ListMinePublicAsync(
        CancellationToken cancellationToken = default);

    Task<StepsItemResponse> PublishMineAsync(
        string id,
        PublishStepsItemRequest request,
        CancellationToken cancellationToken = default);

    Task<StepsItemResponse> UnpublishMineAsync(
        string id,
        CancellationToken cancellationToken = default);
}
