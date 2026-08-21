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

        if (!settings.HasAccountKey)
        {
            throw new InvalidOperationException(
                "Cosmos AccountEndpoint and PrimaryKey (or ConnectionString) are required when UseInMemory is false.");
        }

        var clientOptions = CreateClientOptions(settings.IsEmulator);
        _client = CreateClient(settings, clientOptions);

        _database = _client
            .CreateDatabaseIfNotExistsAsync(settings.DatabaseName)
            .GetAwaiter()
            .GetResult()
            .Database;

        EnsureContainer(_database, "Users", "/id");
        EnsureContainer(_database, "ExternalIdentities", "/id");
        EnsureContainer(_database, "StepsItems", "/createdByUserId");
        EnsureContainer(_database, "LinkedPlatformAccounts", "/userId");
        EnsureContainer(_database, "Creators", "/userId");
        EnsureContainer(_database, "analytics-events", "/partitionKey");
        EnsureContainer(_database, "PlayHistory", "/userId");
    }

    public bool IsEnabled => _enabled;

    public Container Users => GetContainer("Users");

    public Container ExternalIdentities => GetContainer("ExternalIdentities");

    public Container StepsItems => GetContainer("StepsItems");

    public Container LinkedPlatformAccounts => GetContainer("LinkedPlatformAccounts");

    public Container Creators => GetContainer("Creators");

    public Container AnalyticsEvents => GetContainer("analytics-events");

    public Container PlayHistory => GetContainer("PlayHistory");

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

    private static CosmosClient CreateClient(CosmosOptions settings, CosmosClientOptions clientOptions)
    {
        if (!string.IsNullOrWhiteSpace(settings.ConnectionString))
        {
            return new CosmosClient(settings.ConnectionString, clientOptions);
        }

        return new CosmosClient(settings.AccountEndpoint, settings.PrimaryKey, clientOptions);
    }

    private static CosmosClientOptions CreateClientOptions(bool emulator)
    {
        var options = new CosmosClientOptions
        {
            SerializerOptions = new CosmosSerializationOptions
            {
                PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase,
            },
            // Gateway works from local machines and App Service. Direct needs extra TCP ports.
            ConnectionMode = ConnectionMode.Gateway,
        };

        if (emulator)
        {
            options.HttpClientFactory = () =>
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback =
                        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
                };
                return new HttpClient(handler);
            };
        }

        return options;
    }

    private static void EnsureContainer(Database database, string name, string partitionKeyPath)
    {
        database
            .CreateContainerIfNotExistsAsync(name, partitionKeyPath)
            .GetAwaiter()
            .GetResult();
    }
}
