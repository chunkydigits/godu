using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.Users;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<string, UserDocument> _store = new(StringComparer.Ordinal);

    public Task<UserDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(id, out var user);
        return Task.FromResult(user is null ? null : Clone(user));
    }

    public Task<UserDocument> CreateAsync(UserDocument user, CancellationToken cancellationToken = default)
    {
        var stored = Clone(user);
        if (!_store.TryAdd(stored.Id, stored))
        {
            throw new InvalidOperationException($"User already exists: {user.Id}");
        }

        return Task.FromResult(Clone(stored));
    }

    public Task<UserDocument> UpdateAsync(UserDocument user, CancellationToken cancellationToken = default)
    {
        if (!_store.ContainsKey(user.Id))
        {
            throw new InvalidOperationException($"User not found: {user.Id}");
        }

        var stored = Clone(user);
        _store[stored.Id] = stored;
        return Task.FromResult(Clone(stored));
    }

    private static UserDocument Clone(UserDocument user) =>
        new()
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            UseVoiceCuesByDefault = user.UseVoiceCuesByDefault,
            CreatedUtc = user.CreatedUtc,
            UpdatedUtc = user.UpdatedUtc,
        };
}
