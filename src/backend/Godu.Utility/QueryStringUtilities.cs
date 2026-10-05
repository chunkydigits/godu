namespace Godu.Utility;

public static class QueryStringUtilities
{
    /// <summary>
    /// Reads a query value with <see cref="Uri.UnescapeDataString"/> so '+' stays '+'.
    /// ASP.NET [FromQuery] treats '+' as space, which corrupts TikTok authorization codes.
    /// </summary>
    public static string? GetUnescapedValue(string? queryString, string key)
    {
        if (string.IsNullOrEmpty(queryString) || string.IsNullOrEmpty(key))
        {
            return null;
        }

        var qs = queryString[0] == '?' ? queryString[1..] : queryString;
        foreach (var pair in qs.Split('&'))
        {
            if (pair.Length == 0)
            {
                continue;
            }

            var eq = pair.IndexOf('=');
            var name = Uri.UnescapeDataString(eq < 0 ? pair : pair[..eq]);
            if (!name.Equals(key, StringComparison.Ordinal))
            {
                continue;
            }

            return eq < 0 ? string.Empty : Uri.UnescapeDataString(pair[(eq + 1)..]);
        }

        return null;
    }
}
