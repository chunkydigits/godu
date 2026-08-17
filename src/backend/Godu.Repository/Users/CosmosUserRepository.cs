using Godu.Model.Documents;
using Microsoft.Azure.Cosmos;

namespace Godu.Repository.Users;

public sealed class CosmosUserRepository : IUserRepository
{
    private readonly Container _container;

    public CosmosUserRepository(Cosmos.CosmosClientProvider provider)
    {
        _container = provider.Users;
    }

    public async Task<UserDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container
                .ReadItemAsync<UserDocument>(id, new PartitionKey(id), cancellationToken: cancellationToken)
                .ConfigureAwait(false);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<UserDocument> CreateAsync(UserDocument user, CancellationToken cancellationToken = default)
    {
        var response = await _container
            .CreateItemAsync(user, new PartitionKey(user.Id), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        return response.Resource;
    }
}
