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

    /// <summary>Turns a title into a slug, or empty when nothing usable remains.</summary>
    public static string FromTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return string.Empty;
        }

        var buffer = new char[title.Length];
        var length = 0;
        var dash = false;
        foreach (var ch in title.Trim().ToLowerInvariant())
        {
            if (char.IsAsciiLetterOrDigit(ch) || ch is '.' or '_')
            {
                buffer[length++] = ch;
                dash = false;
                continue;
            }

            if ((ch is ' ' or '-') && length > 0 && !dash)
            {
                buffer[length++] = '-';
                dash = true;
            }
        }

        while (length > 0 && buffer[length - 1] == '-')
        {
            length -= 1;
        }

        return length == 0 ? string.Empty : new string(buffer, 0, Math.Min(length, 80));
    }
}
