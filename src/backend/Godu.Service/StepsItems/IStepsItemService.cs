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
}
