using System.Collections.Concurrent;
using Godu.Model.Documents;
using Godu.Utility;

namespace Godu.Repository.PlayHistory;

public sealed class InMemoryPlayHistoryRepository : IPlayHistoryRepository
{
    private readonly ConcurrentDictionary<string, PlayHistoryDocument> _store = new(StringComparer.Ordinal);

    public Task<PlayHistoryDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(IdGenerator.PlayHistoryId(userId, goduId), out var document);
        return Task.FromResult(document is null ? null : Clone(document));
    }

    public Task<IReadOnlyList<PlayHistoryDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(item => string.Equals(item.UserId, userId, StringComparison.Ordinal))
            .OrderByDescending(item => item.LastStartedUtc)
            .ThenByDescending(item => item.UpdatedUtc)
            .Take(take)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<PlayHistoryDocument>>(items);
    }

    public Task<PlayHistoryDocument> UpsertAsync(
        PlayHistoryDocument document,
        CancellationToken cancellationToken = default)
    {
        var stored = Clone(document);
        _store[stored.Id] = stored;
        return Task.FromResult(Clone(stored));
    }

    private static PlayHistoryDocument Clone(PlayHistoryDocument document) =>
        new()
        {
            Id = document.Id,
            UserId = document.UserId,
            GoduId = document.GoduId,
            Title = document.Title,
            CreatorDisplayName = document.CreatorDisplayName,
            PlayPath = document.PlayPath,
            Source = document.Source,
            StartedCount = document.StartedCount,
            CompletedCount = document.CompletedCount,
            LastStartedUtc = document.LastStartedUtc,
            LastCompletedUtc = document.LastCompletedUtc,
            CreatedUtc = document.CreatedUtc,
            UpdatedUtc = document.UpdatedUtc,
        };
}
