using System.Collections.Concurrent;
using Godu.Model.Documents;
using Godu.Utility;

namespace Godu.Repository.SavedGodus;

public sealed class InMemorySavedGoduRepository : ISavedGoduRepository
{
    private readonly ConcurrentDictionary<string, SavedGoduDocument> _store = new(StringComparer.Ordinal);

    public Task<SavedGoduDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(IdGenerator.SavedGoduId(userId, goduId), out var document);
        return Task.FromResult(document is null ? null : Clone(document));
    }

    public Task<IReadOnlyList<SavedGoduDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(item => string.Equals(item.UserId, userId, StringComparison.Ordinal))
            .OrderByDescending(item => item.SavedUtc)
            .Take(take)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<SavedGoduDocument>>(items);
    }

    public Task<SavedGoduDocument> UpsertAsync(
        SavedGoduDocument document,
        CancellationToken cancellationToken = default)
    {
        var stored = Clone(document);
        _store[stored.Id] = stored;
        return Task.FromResult(Clone(stored));
    }

    public Task DeleteAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        _store.TryRemove(IdGenerator.SavedGoduId(userId, goduId), out _);
        return Task.CompletedTask;
    }

    private static SavedGoduDocument Clone(SavedGoduDocument document) =>
        new()
        {
            Id = document.Id,
            UserId = document.UserId,
            GoduId = document.GoduId,
            Title = document.Title,
            CreatorDisplayName = document.CreatorDisplayName,
            PlayPath = document.PlayPath,
            Category = document.Category,
            SavedUtc = document.SavedUtc,
        };
}
