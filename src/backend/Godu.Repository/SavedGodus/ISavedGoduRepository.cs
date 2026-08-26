using Godu.Model.Documents;

namespace Godu.Repository.SavedGodus;

public interface ISavedGoduRepository
{
    Task<SavedGoduDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SavedGoduDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default);

    Task<SavedGoduDocument> UpsertAsync(
        SavedGoduDocument document,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default);
}
