using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Godu.Service.PlatformAccounts;

public sealed class InMemoryPlatformOAuthStateStore : IPlatformOAuthStateStore
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);

    private readonly ConcurrentDictionary<string, Entry> _store = new(StringComparer.Ordinal);

    public string Create(string userId)
    {
        PruneExpired();
        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _store[state] = new Entry(userId, DateTime.UtcNow.Add(Ttl));
        return state;
    }

    public bool TryConsume(string state, out string userId)
    {
        userId = string.Empty;
        if (string.IsNullOrWhiteSpace(state) || !_store.TryRemove(state, out var entry))
        {
            return false;
        }

        if (entry.ExpiresUtc < DateTime.UtcNow)
        {
            return false;
        }

        userId = entry.UserId;
        return true;
    }

    private void PruneExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var pair in _store)
        {
            if (pair.Value.ExpiresUtc < now)
            {
                _store.TryRemove(pair.Key, out _);
            }
        }
    }

    private sealed record Entry(string UserId, DateTime ExpiresUtc);
}
