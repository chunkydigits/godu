using Godu.Model.Configuration;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Options;

namespace Godu.Repository.Cosmos;

public sealed class CosmosClientProvider : IAsyncDisposable
{
    private readonly CosmosClient? _client;
    private readonly Database? _database;
    private readonly bool _enabled;

    public CosmosClientProvider(IOptions<CosmosOptions> options)
    {
        var settings = options.Value;
        _enabled = !settings.UseInMemory;

        if (!_enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(settings.ConnectionString))
        {
            throw new InvalidOperationException("Cosmos connection string is required when UseInMemory is false.");
        }

        _client = new CosmosClient(
            settings.ConnectionString,
            new CosmosClientOptions
            {
                SerializerOptions = new CosmosSerializationOptions
                {
                    PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase,
                },
                ConnectionMode = ConnectionMode.Gateway,
                HttpClientFactory = () =>
                {
                    var handler = new HttpClientHandler
                    {
                        ServerCertificateCustomValidationCallback =
                            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
                    };
                    return new HttpClient(handler);
                },
            });

        _database = _client
            .CreateDatabaseIfNotExistsAsync(settings.DatabaseName)
            .GetAwaiter()
            .GetResult()
            .Database;

        EnsureContainer(_database, "Users", "/id");
        EnsureContainer(_database, "ExternalIdentities", "/id");
        EnsureContainer(_database, "StepsItems", "/createdByUserId");
        EnsureContainer(_database, "LinkedPlatformAccounts", "/userId");
    }

    public bool IsEnabled => _enabled;

    public Container Users => GetContainer("Users");

    public Container ExternalIdentities => GetContainer("ExternalIdentities");

    public Container StepsItems => GetContainer("StepsItems");

    public Container LinkedPlatformAccounts => GetContainer("LinkedPlatformAccounts");

    public ValueTask DisposeAsync()
    {
        _client?.Dispose();
        return ValueTask.CompletedTask;
    }

    private Container GetContainer(string name)
    {
        if (_database is null)
        {
            throw new InvalidOperationException("Cosmos is not enabled.");
        }

        return _database.GetContainer(name);
    }

    private static void EnsureContainer(Database database, string name, string partitionKeyPath)
    {
        database
            .CreateContainerIfNotExistsAsync(name, partitionKeyPath)
            .GetAwaiter()
            .GetResult();
    }
}
