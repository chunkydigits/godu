using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.Creators;

public sealed class InMemoryCreatorRepository : ICreatorRepository
{
    private readonly ConcurrentDictionary<string, CreatorDocument> _byUser = new(StringComparer.Ordinal);

    public Task<CreatorDocument?> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        _byUser.TryGetValue(userId, out var creator);
        return Task.FromResult(creator is null ? null : Clone(creator));
    }

    public Task<CreatorDocument> CreateAsync(
        CreatorDocument creator,
        CancellationToken cancellationToken = default)
    {
        var stored = Clone(creator);
        if (!_byUser.TryAdd(stored.UserId, stored))
        {
            throw new InvalidOperationException($"Creator already exists for user {stored.UserId}");
        }

        return Task.FromResult(Clone(stored));
    }

    public Task<CreatorDocument> UpdateAsync(
        CreatorDocument creator,
        CancellationToken cancellationToken = default)
    {
        if (!_byUser.ContainsKey(creator.UserId))
        {
            throw new InvalidOperationException($"Creator not found for user {creator.UserId}");
        }

        var stored = Clone(creator);
        _byUser[stored.UserId] = stored;
        return Task.FromResult(Clone(stored));
    }

    private static CreatorDocument Clone(CreatorDocument creator) =>
        new()
        {
            Id = creator.Id,
            UserId = creator.UserId,
            DisplayName = creator.DisplayName,
            Bio = creator.Bio,
            ProfileImageUrl = creator.ProfileImageUrl,
            CreatedUtc = creator.CreatedUtc,
            UpdatedUtc = creator.UpdatedUtc,
        };
}
