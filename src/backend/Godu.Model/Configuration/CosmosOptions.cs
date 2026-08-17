namespace Godu.Model.Configuration;

public sealed class CosmosOptions
{
    public const string SectionName = "Cosmos";

    /// <summary>
    /// When true, use in-memory repositories (no Cosmos required).
    /// </summary>
    public bool UseInMemory { get; set; }

    public string DatabaseName { get; set; } = "Godu";

    /// <summary>Account URI, e.g. https://gd-cosmos-prod.documents.azure.com:443/</summary>
    public string AccountEndpoint { get; set; } = string.Empty;

    /// <summary>Loaded from Key Vault as Cosmos:PrimaryKey (secret name Cosmos--PrimaryKey).</summary>
    public string PrimaryKey { get; set; } = string.Empty;

    /// <summary>Optional full connection string (emulator). Takes precedence when set.</summary>
    public string ConnectionString { get; set; } = string.Empty;

    public bool IsEmulator =>
        ContainsLocalhost(ConnectionString) || ContainsLocalhost(AccountEndpoint);

    public bool HasAccountKey =>
        !string.IsNullOrWhiteSpace(ConnectionString)
        || (!string.IsNullOrWhiteSpace(AccountEndpoint) && !string.IsNullOrWhiteSpace(PrimaryKey));

    private static bool ContainsLocalhost(string value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Contains("localhost", StringComparison.OrdinalIgnoreCase);
}
