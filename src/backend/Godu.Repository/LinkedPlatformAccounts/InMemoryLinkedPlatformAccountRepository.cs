using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.LinkedPlatformAccounts;

public sealed class InMemoryLinkedPlatformAccountRepository : ILinkedPlatformAccountRepository
{
    private readonly ConcurrentDictionary<string, LinkedPlatformAccountDocument> _store = new(StringComparer.Ordinal);

    public Task<LinkedPlatformAccountDocument?> GetByIdAsync(
        string id,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!_store.TryGetValue(id, out var account))
        {
            return Task.FromResult<LinkedPlatformAccountDocument?>(null);
        }

        if (!string.Equals(account.UserId, userId, StringComparison.Ordinal))
        {
            return Task.FromResult<LinkedPlatformAccountDocument?>(null);
        }

        return Task.FromResult<LinkedPlatformAccountDocument?>(Clone(account));
    }

    public Task<IReadOnlyList<LinkedPlatformAccountDocument>> ListByUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(x => string.Equals(x.UserId, userId, StringComparison.Ordinal))
            .OrderByDescending(x => x.UpdatedUtc)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<LinkedPlatformAccountDocument>>(items);
    }

    public Task<LinkedPlatformAccountDocument?> GetByProviderAndExternalIdAsync(
        string provider,
        string externalAccountId,
        CancellationToken cancellationToken = default)
    {
        var match = _store.Values.FirstOrDefault(x =>
            string.Equals(x.Provider, provider, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.ExternalAccountId, externalAccountId, StringComparison.Ordinal));

        return Task.FromResult(match is null ? null : Clone(match));
    }

    public Task<LinkedPlatformAccountDocument?> GetVerifiedByProviderAndUsernameAsync(
        string provider,
        string username,
        CancellationToken cancellationToken = default)
    {
        var handle = username.Trim().TrimStart('@');
        var match = _store.Values.FirstOrDefault(x =>
            x.IsVerified
            && string.Equals(x.Provider, provider, StringComparison.OrdinalIgnoreCase)
            && (string.Equals(x.Username, handle, StringComparison.OrdinalIgnoreCase)
                || x.UsernameAliases.Contains(handle, StringComparer.OrdinalIgnoreCase)));

        return Task.FromResult(match is null ? null : Clone(match));
    }

    public Task<LinkedPlatformAccountDocument?> GetVerifiedByCurrentUsernameAsync(
        string provider,
        string username,
        CancellationToken cancellationToken = default)
    {
        var handle = username.Trim().TrimStart('@');
        var match = _store.Values.FirstOrDefault(x =>
            x.IsVerified
            && string.Equals(x.Provider, provider, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Username, handle, StringComparison.OrdinalIgnoreCase));

        return Task.FromResult(match is null ? null : Clone(match));
    }

    public Task<IReadOnlyList<LinkedPlatformAccountDocument>> ListVerifiedByAliasAsync(
        string provider,
        string username,
        CancellationToken cancellationToken = default)
    {
        var handle = username.Trim().TrimStart('@');
        var matches = _store.Values
            .Where(x =>
                x.IsVerified
                && string.Equals(x.Provider, provider, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(x.Username, handle, StringComparison.OrdinalIgnoreCase)
                && x.UsernameAliases.Contains(handle, StringComparer.OrdinalIgnoreCase))
            .OrderByDescending(x => x.UpdatedUtc)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<LinkedPlatformAccountDocument>>(matches);
    }

    public Task<LinkedPlatformAccountDocument> CreateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
    {
        var stored = Clone(account);
        if (!_store.TryAdd(stored.Id, stored))
        {
            throw new InvalidOperationException($"Linked platform account already exists: {stored.Id}");
        }

        return Task.FromResult(Clone(stored));
    }

    public Task<LinkedPlatformAccountDocument> UpdateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
    {
        if (!_store.ContainsKey(account.Id))
        {
            throw new InvalidOperationException($"Linked platform account not found: {account.Id}");
        }

        var stored = Clone(account);
        _store[account.Id] = stored;
        return Task.FromResult(Clone(stored));
    }

    public Task DeleteAsync(string id, string userId, CancellationToken cancellationToken = default)
    {
        if (_store.TryGetValue(id, out var account)
            && string.Equals(account.UserId, userId, StringComparison.Ordinal))
        {
            _store.TryRemove(id, out _);
        }

        return Task.CompletedTask;
    }

    private static LinkedPlatformAccountDocument Clone(LinkedPlatformAccountDocument account)
    {
        return new LinkedPlatformAccountDocument
        {
            Id = account.Id,
            UserId = account.UserId,
            Provider = account.Provider,
            ExternalAccountId = account.ExternalAccountId,
            Username = account.Username,
            DisplayName = account.DisplayName,
            ProfileUrl = account.ProfileUrl,
            AvatarUrl = account.AvatarUrl,
            Bio = account.Bio,
            UsernameAliases = [.. account.UsernameAliases],
            IsVerified = account.IsVerified,
            VerifiedUtc = account.VerifiedUtc,
            CreatedUtc = account.CreatedUtc,
            UpdatedUtc = account.UpdatedUtc,
            EncryptedAccessToken = account.EncryptedAccessToken,
            EncryptedRefreshToken = account.EncryptedRefreshToken,
            AccessTokenExpiresUtc = account.AccessTokenExpiresUtc,
            RefreshTokenExpiresUtc = account.RefreshTokenExpiresUtc,
            Scope = account.Scope,
        };
    }
}
