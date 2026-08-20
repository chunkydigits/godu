using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.Creators;

public sealed class CosmosCreatorRepository : ICreatorRepository
{
    private readonly Container _container;

    public CosmosCreatorRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.Creators;
    }

    public async Task<CreatorDocument?> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT * FROM c WHERE c.userId = @userId";
        var query = new QueryDefinition(sql).WithParameter("@userId", userId);

        using var iterator = _container.GetItemQueryIterator<CreatorDocument>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });

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

    public async Task<CreatorDocument> CreateAsync(
        CreatorDocument creator,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .CreateItemAsync(creator, new PartitionKey(creator.UserId), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }

    public async Task<CreatorDocument> UpdateAsync(
        CreatorDocument creator,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .ReplaceItemAsync(
                creator,
                creator.Id,
                new PartitionKey(creator.UserId),
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }
}
