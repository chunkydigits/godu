using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.StepsItems;

public sealed class CosmosStepsItemRepository : IStepsItemRepository
{
    private readonly Container _container;

    public CosmosStepsItemRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.StepsItems;
    }

    public async Task<StepsItemDocument?> GetByIdAsync(
        string id,
        string createdByUserId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container
                .ReadItemAsync<StepsItemDocument>(
                    id,
                    new PartitionKey(createdByUserId),
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<StepsItemDocument>> ListByUserAsync(
        string createdByUserId,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var sql = includeArchived
            ? "SELECT * FROM c WHERE c.createdByUserId = @userId"
            : "SELECT * FROM c WHERE c.createdByUserId = @userId AND c.status != 'archived'";

        var query = new QueryDefinition(sql).WithParameter("@userId", createdByUserId);
        var results = new List<StepsItemDocument>();

        using var iterator = _container.GetItemQueryIterator<StepsItemDocument>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(createdByUserId) });

        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
            results.AddRange(page.Resource);
        }

        return results.OrderByDescending(x => x.UpdatedUtc).ToList();
    }

    public async Task<StepsItemDocument?> GetPublicBySlugAsync(
        string provider,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.status = 'published'
              AND c.visibility = 'public'
              AND c.slug = @slug
              AND c.video.provider = @provider
              AND c.video.creatorUsername = @username
            """;

        var query = new QueryDefinition(sql)
            .WithParameter("@slug", slug.ToLowerInvariant())
            .WithParameter("@provider", provider.ToLowerInvariant())
            .WithParameter("@username", platformUsername.ToLowerInvariant());

        using var iterator = _container.GetItemQueryIterator<StepsItemDocument>(query);
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

    public async Task<IReadOnlyList<StepsItemDocument>> ListPublicByUserAsync(
        string createdByUserId,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.createdByUserId = @userId
              AND c.status = 'published'
              AND c.visibility = 'public'
            """;

        return await QueryListAsync(
                new QueryDefinition(sql).WithParameter("@userId", createdByUserId),
                new PartitionKey(createdByUserId),
                cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<StepsItemDocument>> ListPublicByLinkedAccountAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string? excludeItemId,
        int take,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.createdByUserId = @userId
              AND c.linkedPlatformAccountId = @accountId
              AND c.status = 'published'
              AND c.visibility = 'public'
            """;

        var items = await QueryListAsync(
                new QueryDefinition(sql)
                    .WithParameter("@userId", createdByUserId)
                    .WithParameter("@accountId", linkedPlatformAccountId),
                new PartitionKey(createdByUserId),
                cancellationToken)
            .ConfigureAwait(false);

        return items
            .Where(x => excludeItemId is null || !string.Equals(x.Id, excludeItemId, StringComparison.Ordinal))
            .OrderByDescending(x => x.PublishedUtc ?? x.UpdatedUtc)
            .Take(Math.Max(0, take))
            .ToList();
    }

    public async Task<IReadOnlyList<StepsItemDocument>> ListPublicByUsernameAsync(
        string provider,
        string platformUsername,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.status = 'published'
              AND c.visibility = 'public'
              AND c.video.provider = @provider
              AND c.video.creatorUsername = @username
            """;

        var query = new QueryDefinition(sql)
            .WithParameter("@provider", provider.ToLowerInvariant())
            .WithParameter("@username", platformUsername.ToLowerInvariant());

        return await QueryListAsync(query, partitionKey: null, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> SlugTakenAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string slug,
        string? excludeItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.createdByUserId = @userId
              AND c.linkedPlatformAccountId = @accountId
              AND c.slug = @slug
              AND c.status = 'published'
              AND c.visibility = 'public'
            """;

        var items = await QueryListAsync(
                new QueryDefinition(sql)
                    .WithParameter("@userId", createdByUserId)
                    .WithParameter("@accountId", linkedPlatformAccountId)
                    .WithParameter("@slug", slug.ToLowerInvariant()),
                new PartitionKey(createdByUserId),
                cancellationToken)
            .ConfigureAwait(false);

        return items.Any(x => excludeItemId is null || !string.Equals(x.Id, excludeItemId, StringComparison.Ordinal));
    }

    private async Task<IReadOnlyList<StepsItemDocument>> QueryListAsync(
        QueryDefinition query,
        PartitionKey? partitionKey,
        CancellationToken cancellationToken)
    {
        var results = new List<StepsItemDocument>();
        var options = partitionKey is { } key
            ? new QueryRequestOptions { PartitionKey = key }
            : new QueryRequestOptions();

        using var iterator = _container.GetItemQueryIterator<StepsItemDocument>(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
            results.AddRange(page.Resource);
        }

        return results.OrderByDescending(x => x.PublishedUtc ?? x.UpdatedUtc).ToList();
    }

    public async Task<StepsItemDocument> CreateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .CreateItemAsync(item, new PartitionKey(item.CreatedByUserId), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }

    public async Task<StepsItemDocument> UpdateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .ReplaceItemAsync(
                item,
                item.Id,
                new PartitionKey(item.CreatedByUserId),
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }
}
