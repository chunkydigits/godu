using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.Users;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<string, UserDocument> _store = new(StringComparer.Ordinal);

    public Task<UserDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(id, out var user);
        return Task.FromResult(user);
    }

    public Task<UserDocument> CreateAsync(UserDocument user, CancellationToken cancellationToken = default)
    {
        if (!_store.TryAdd(user.Id, user))
        {
            throw new InvalidOperationException($"User already exists: {user.Id}");
        }

        return Task.FromResult(user);
    }
}
