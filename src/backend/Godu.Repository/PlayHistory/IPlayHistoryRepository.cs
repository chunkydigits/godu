using Godu.Model.Documents;

namespace Godu.Repository.PlayHistory;

public interface IPlayHistoryRepository
{
    Task<PlayHistoryDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlayHistoryDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default);

    Task<PlayHistoryDocument> UpsertAsync(
        PlayHistoryDocument document,
        CancellationToken cancellationToken = default);
}
