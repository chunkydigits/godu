using Godu.Model.Documents;
using Godu.Utility;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.PlayHistory;

public sealed class CosmosPlayHistoryRepository : IPlayHistoryRepository
{
    private readonly Container _container;

    public CosmosPlayHistoryRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.PlayHistory;
    }

    public async Task<PlayHistoryDocument?> GetAsync(
        string userId,
        string goduId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container
                .ReadItemAsync<PlayHistoryDocument>(
                    IdGenerator.PlayHistoryId(userId, goduId),
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

    public async Task<IReadOnlyList<PlayHistoryDocument>> ListByUserAsync(
        string userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.userId = @userId
            ORDER BY c.lastStartedUtc DESC
            """;

        var query = new QueryDefinition(sql).WithParameter("@userId", userId);
        var results = new List<PlayHistoryDocument>();
        using var iterator = _container.GetItemQueryIterator<PlayHistoryDocument>(
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

    public async Task<PlayHistoryDocument> UpsertAsync(
        PlayHistoryDocument document,
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
}
