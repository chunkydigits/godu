using Godu.Model.Documents;
using Godu.Utility;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.SavedGodus;

public sealed class CosmosSavedGoduRepository : ISavedGoduRepository
{
    private readonly Container _container;

    public CosmosSavedGoduRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.SavedGodus;
    }

    public async Task<SavedGoduDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container
                .ReadItemAsync<SavedGoduDocument>(
                    IdGenerator.SavedGoduId(userId, goduId),
                    new PartitionKey(userId),
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<SavedGoduDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.userId = @userId
            ORDER BY c.savedUtc DESC
            """;

        var query = new QueryDefinition(sql).WithParameter("@userId", userId);
        var results = new List<SavedGoduDocument>();
        using var iterator = _container.GetItemQueryIterator<SavedGoduDocument>(
            query,
            requestOptions: new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(userId),
                MaxItemCount = take,
            });

        while (iterator.HasMoreResults && results.Count < take)
        {
            var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
            results.AddRange(page.Resource);
        }

        return results.Take(take).ToList();
    }

    public async Task<SavedGoduDocument> UpsertAsync(
        SavedGoduDocument document,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .UpsertItemAsync(
                document,
                new PartitionKey(document.UserId),
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }

    public async Task DeleteAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _container
                .DeleteItemAsync<SavedGoduDocument>(
                    IdGenerator.SavedGoduId(userId, goduId),
                    new PartitionKey(userId),
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
        }
    }
}
