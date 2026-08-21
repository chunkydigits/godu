using System.Text.RegularExpressions;

namespace Godu.Utility;

public static class TikTokHandleUrls
{
    public static string RewriteSourceUrl(string sourceUrl, string fromUsername, string toUsername)
    {
        if (string.IsNullOrWhiteSpace(sourceUrl)
            || string.IsNullOrWhiteSpace(fromUsername)
            || string.IsNullOrWhiteSpace(toUsername))
        {
            return sourceUrl;
        }

        var from = fromUsername.Trim().TrimStart('@');
        var to = toUsername.Trim().TrimStart('@');
        if (string.IsNullOrEmpty(from) || string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
        {
            return sourceUrl;
        }

        return Regex.Replace(
            sourceUrl,
            $@"(?<=tiktok\.com/@){Regex.Escape(from)}(?=/|\?|$)",
            to,
            RegexOptions.IgnoreCase);
    }
}
