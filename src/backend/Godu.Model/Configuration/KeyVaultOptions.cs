namespace Godu.Model.Configuration;

public sealed class KeyVaultOptions
{
    public const string SectionName = "KeyVault";

    public string VaultUri { get; set; } = string.Empty;
}
