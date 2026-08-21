using Godu.Model.Documents;

namespace Godu.Repository.StepsItems;

public interface IStepsItemRepository
{
    Task<StepsItemDocument?> GetByIdAsync(
        string id,
        string createdByUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemDocument>> ListByUserAsync(
        string createdByUserId,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<StepsItemDocument?> GetPublicBySlugAsync(
        string provider,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemDocument>> ListPublicByUserAsync(
        string createdByUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemDocument>> ListPublicByLinkedAccountAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string? excludeItemId,
        int take,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StepsItemDocument>> ListPublicByUsernameAsync(
        string provider,
        string platformUsername,
        CancellationToken cancellationToken = default);

    Task<StepsItemDocument?> GetPublicByAccountSlugAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string slug,
        CancellationToken cancellationToken = default);

    Task<int> RewriteCreatorHandleAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string fromUsername,
        string toUsername,
        CancellationToken cancellationToken = default);

    Task<bool> SlugTakenAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string slug,
        string? excludeItemId,
        CancellationToken cancellationToken = default);

    Task<StepsItemDocument> CreateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default);

    Task<StepsItemDocument> UpdateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default);
}
