using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.ExternalIdentities;

public sealed class InMemoryExternalIdentityRepository : IExternalIdentityRepository
{
    private readonly ConcurrentDictionary<string, ExternalIdentityDocument> _store = new(StringComparer.Ordinal);

    public Task<ExternalIdentityDocument?> GetByProviderSubjectAsync(
        string identityProvider,
        string externalSubjectId,
        CancellationToken cancellationToken = default)
    {
        var match = _store.Values.FirstOrDefault(x =>
            string.Equals(x.IdentityProvider, identityProvider, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.ExternalSubjectId, externalSubjectId, StringComparison.Ordinal));

        return Task.FromResult(match);
    }

    public Task<ExternalIdentityDocument> CreateAsync(
        ExternalIdentityDocument identity,
        CancellationToken cancellationToken = default)
    {
        if (!_store.TryAdd(identity.Id, identity))
        {
            throw new InvalidOperationException($"External identity already exists: {identity.Id}");
        }

        return Task.FromResult(identity);
    }
}
