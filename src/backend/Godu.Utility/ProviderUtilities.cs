namespace Godu.Utility;

public static class ProviderUtilities
{
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["t"] = "tiktok",
        ["tiktok"] = "tiktok",
        ["y"] = "youtube",
        ["youtube"] = "youtube",
        ["i"] = "instagram",
        ["instagram"] = "instagram",
        ["v"] = "vimeo",
        ["vimeo"] = "vimeo",
    };

    public static bool TryCanonicalise(string? alias, out string provider)
    {
        provider = string.Empty;
        if (string.IsNullOrWhiteSpace(alias))
        {
            return false;
        }

        if (!Aliases.TryGetValue(alias.Trim(), out var resolved))
        {
            return false;
        }

        provider = resolved;
        return true;
    }
}
