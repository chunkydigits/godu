using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.ExternalIdentities;

public sealed class CosmosExternalIdentityRepository : IExternalIdentityRepository
{
    private readonly Container _container;

    public CosmosExternalIdentityRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.ExternalIdentities;
    }

    public async Task<ExternalIdentityDocument?> GetByProviderSubjectAsync(
        string identityProvider,
        string externalSubjectId,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            "SELECT * FROM c WHERE c.identityProvider = @provider AND c.externalSubjectId = @subject";

        var query = new QueryDefinition(sql)
            .WithParameter("@provider", identityProvider)
            .WithParameter("@subject", externalSubjectId);

        using var iterator = _container.GetItemQueryIterator<ExternalIdentityDocument>(query);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
            var match = page.Resource.FirstOrDefault();
            if (match is not null)
            {
                return match;
            }
        }

        return null;
    }

    public async Task<ExternalIdentityDocument> CreateAsync(
        ExternalIdentityDocument identity,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .CreateItemAsync(identity, new PartitionKey(identity.Id), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }
}
