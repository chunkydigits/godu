using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.Analytics;

public sealed class CosmosAnalyticsEventRepository : IAnalyticsEventRepository
{
    private readonly Container _container;

    public CosmosAnalyticsEventRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.AnalyticsEvents;
    }

    public async Task CreateAsync(AnalyticsEventDocument document, CancellationToken cancellationToken = default)
    {
        await _container
            .CreateItemAsync(document, new PartitionKey(document.PartitionKey), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<AnalyticsEventDocument>> ListInRangeAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        string environment,
        CancellationToken cancellationToken = default)
    {
        var results = new List<AnalyticsEventDocument>();
        foreach (var month in MonthsTouching(fromUtc, toUtcExclusive))
        {
            const string sql =
                """
                SELECT * FROM c
                WHERE c.environment = @environment
                  AND c.timestamp >= @from
                  AND c.timestamp < @to
                """;

            var query = new QueryDefinition(sql)
                .WithParameter("@environment", environment)
                .WithParameter("@from", fromUtc)
                .WithParameter("@to", toUtcExclusive);

            using var iterator = _container.GetItemQueryIterator<AnalyticsEventDocument>(
                query,
                requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(month) });

            while (iterator.HasMoreResults)
            {
                var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
                results.AddRange(page.Resource);
            }
        }

        return results.OrderBy(item => item.Timestamp).ToList();
    }

    private static IEnumerable<string> MonthsTouching(DateTime fromUtc, DateTime toUtcExclusive)
    {
        var cursor = new DateTime(fromUtc.Year, fromUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = toUtcExclusive <= fromUtc ? fromUtc.AddTicks(1) : toUtcExclusive;
        while (cursor < end)
        {
            yield return cursor.ToString("yyyy-MM");
            cursor = cursor.AddMonths(1);
        }
    }
}
