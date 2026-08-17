using System.Text.RegularExpressions;

namespace Godu.Utility;

public static partial class SlugUtilities
{
    [GeneratedRegex(@"^[a-z0-9._-]+$")]
    private static partial Regex ValidSlugRegex();

    public static string Canonicalise(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return string.Empty;
        }

        return slug.Trim().ToLowerInvariant();
    }

    public static bool IsValid(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return false;
        }

        return ValidSlugRegex().IsMatch(slug);
    }
}
