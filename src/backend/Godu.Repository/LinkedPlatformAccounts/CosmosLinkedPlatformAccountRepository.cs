using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.LinkedPlatformAccounts;

public sealed class CosmosLinkedPlatformAccountRepository : ILinkedPlatformAccountRepository
{
    private readonly Container _container;

    public CosmosLinkedPlatformAccountRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.LinkedPlatformAccounts;
    }

    public async Task<LinkedPlatformAccountDocument?> GetByIdAsync(
        string id,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container
                .ReadItemAsync<LinkedPlatformAccountDocument>(
                    id,
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

    public async Task<IReadOnlyList<LinkedPlatformAccountDocument>> ListByUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT * FROM c WHERE c.userId = @userId";
        var query = new QueryDefinition(sql).WithParameter("@userId", userId);
        var results = new List<LinkedPlatformAccountDocument>();

        using var iterator = _container.GetItemQueryIterator<LinkedPlatformAccountDocument>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });

        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync(cancellationToken).ConfigureAwait(false);
            results.AddRange(page.Resource);
        }

        return results.OrderByDescending(x => x.UpdatedUtc).ToList();
    }

    public async Task<LinkedPlatformAccountDocument?> GetByProviderAndExternalIdAsync(
        string provider,
        string externalAccountId,
        CancellationToken cancellationToken = default)
    {
        const string sql =
            """
            SELECT * FROM c
            WHERE c.provider = @provider
              AND c.externalAccountId = @externalId
            """;

        var query = new QueryDefinition(sql)
            .WithParameter("@provider", provider.ToLowerInvariant())
            .WithParameter("@externalId", externalAccountId);

        using var iterator = _container.GetItemQueryIterator<LinkedPlatformAccountDocument>(query);
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

    public async Task<LinkedPlatformAccountDocument> CreateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .CreateItemAsync(account, new PartitionKey(account.UserId), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }

    public async Task<LinkedPlatformAccountDocument> UpdateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default)
    {
        var response = await _container
            .ReplaceItemAsync(
                account,
                account.Id,
                new PartitionKey(account.UserId),
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }

    public async Task DeleteAsync(string id, string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _container
                .DeleteItemAsync<LinkedPlatformAccountDocument>(
                    id,
                    new PartitionKey(userId),
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
        }
    }
}
