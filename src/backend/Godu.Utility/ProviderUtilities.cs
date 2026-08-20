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

    /// <summary>SPA path segment for a provider, e.g. tiktok → t.</summary>
    public static string PublicAlias(string provider)
    {
        return provider.Trim().ToLowerInvariant() switch
        {
            "tiktok" => "t",
            "youtube" => "y",
            "instagram" => "i",
            "vimeo" => "v",
            var value => value,
        };
    }

    public static string? PublicPath(string? provider, string? username, string? slug)
    {
        if (string.IsNullOrWhiteSpace(provider)
            || string.IsNullOrWhiteSpace(username)
            || string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        var handle = username.Trim().TrimStart('@').ToLowerInvariant();
        var canonicalSlug = SlugUtilities.Canonicalise(slug);
        if (string.IsNullOrEmpty(handle) || string.IsNullOrEmpty(canonicalSlug))
        {
            return null;
        }

        return $"/{PublicAlias(provider)}/{handle}/{canonicalSlug}";
    }
}
