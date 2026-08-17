namespace Godu.Model.Configuration;

public sealed class CosmosOptions
{
    public const string SectionName = "Cosmos";

    /// <summary>
    /// When true, use in-memory repositories (no emulator required).
    /// </summary>
    public bool UseInMemory { get; set; }

    public string ConnectionString { get; set; } = string.Empty;

    public string DatabaseName { get; set; } = "Godu";
}
