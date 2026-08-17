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

    Task<StepsItemDocument> CreateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default);

    Task<StepsItemDocument> UpdateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default);
}
