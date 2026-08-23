using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Godu.Model.Responses;

namespace Godu.Service.TikTok;

public sealed partial class TikTokOEmbedService : ITikTokOEmbedService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;

    public TikTokOEmbedService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<TikTokVideoMetadataResponse?> LookupAsync(
        string videoUrlOrId,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormaliseTikTokVideoUrl(videoUrlOrId, out var sourceUrl))
        {
            throw new ArgumentException("A valid TikTok video URL or ID is required.");
        }

        var requestUri = $"oembed?url={Uri.EscapeDataString(sourceUrl)}";
        using var response = await _httpClient
            .GetAsync(requestUri, cancellationToken)
            .ConfigureAwait(false);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"TikTok oEmbed lookup failed ({(int)response.StatusCode}).");
        }

        await using var stream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);

        var payload = await JsonSerializer
            .DeserializeAsync<TikTokOEmbedPayload>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);

        if (payload is null || string.IsNullOrWhiteSpace(payload.Title))
        {
            return null;
        }

        var authorUniqueId = string.IsNullOrWhiteSpace(payload.AuthorUniqueId)
            ? null
            : payload.AuthorUniqueId.Trim();
        var videoId = FirstNonEmpty(
            payload.EmbedProductId,
            VideoIdFromHtml(payload.Html));
        var watchUrl = videoId is null
            ? sourceUrl
            : CanonicalWatchUrl(videoId, authorUniqueId);

        return new TikTokVideoMetadataResponse
        {
            Caption = payload.Title.Trim(),
            AuthorName = string.IsNullOrWhiteSpace(payload.AuthorName) ? null : payload.AuthorName.Trim(),
            AuthorUniqueId = authorUniqueId,
            ThumbnailUrl = string.IsNullOrWhiteSpace(payload.ThumbnailUrl) ? null : payload.ThumbnailUrl.Trim(),
            ExternalVideoId = videoId,
            SourceUrl = watchUrl,
        };
    }

    public static bool TryNormaliseTikTokVideoUrl(string input, out string sourceUrl)
    {
        sourceUrl = string.Empty;
        var trimmed = input.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return false;
        }

        if (BareVideoIdRegex().IsMatch(trimmed))
        {
            sourceUrl = CanonicalWatchUrl(trimmed, null);
            return true;
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (!IsAllowedTikTokHost(uri.Host))
        {
            return false;
        }

        var watchMatch = VideoPathRegex().Match(uri.AbsolutePath);
        if (watchMatch.Success)
        {
            sourceUrl = CanonicalWatchUrl(watchMatch.Groups["id"].Value, watchMatch.Groups["user"].Value);
            return true;
        }

        if (TryCanonicalShortUrl(uri, out sourceUrl))
        {
            return true;
        }

        return false;
    }

    public static string CanonicalWatchUrl(string videoId, string? username)
    {
        var handle = string.IsNullOrWhiteSpace(username) ? "video" : username.Trim().TrimStart('@');
        if (string.IsNullOrEmpty(handle))
        {
            handle = "video";
        }

        return $"https://www.tiktok.com/@{handle}/video/{videoId}";
    }

    private static bool TryCanonicalShortUrl(Uri uri, out string sourceUrl)
    {
        sourceUrl = string.Empty;
        var host = uri.Host;
        var path = uri.AbsolutePath;

        if (IsShortLinkHost(host))
        {
            var match = ShortCodePathRegex().Match(path);
            if (!match.Success)
            {
                return false;
            }

            var canonHost = host.StartsWith("www.", StringComparison.OrdinalIgnoreCase)
                ? host[4..]
                : host;
            sourceUrl = $"https://{canonHost.ToLowerInvariant()}/{match.Groups["code"].Value}/";
            return true;
        }

        var tMatch = ShareTPathRegex().Match(path);
        if (!tMatch.Success)
        {
            return false;
        }

        sourceUrl = $"https://www.tiktok.com/t/{tMatch.Groups["code"].Value}/";
        return true;
    }

    private static bool IsAllowedTikTokHost(string host) =>
        host.Equals("tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("www.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("m.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || IsShortLinkHost(host);

    private static bool IsShortLinkHost(string host) =>
        host.Equals("vm.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("www.vm.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("vt.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("www.vt.tiktok.com", StringComparison.OrdinalIgnoreCase);

    private static string? VideoIdFromHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        var match = HtmlVideoIdRegex().Match(html);
        return match.Success ? match.Groups["id"].Value : null;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    [GeneratedRegex(@"^\d{5,}$")]
    private static partial Regex BareVideoIdRegex();

    [GeneratedRegex(@"^/@(?<user>[^/]+)/video/(?<id>\d{5,})/?$", RegexOptions.IgnoreCase)]
    private static partial Regex VideoPathRegex();

    [GeneratedRegex(@"^/(?<code>[A-Za-z0-9]{5,32})/?$")]
    private static partial Regex ShortCodePathRegex();

    [GeneratedRegex(@"^/t/(?<code>[A-Za-z0-9]{5,32})/?$", RegexOptions.IgnoreCase)]
    private static partial Regex ShareTPathRegex();

    [GeneratedRegex(@"data-video-id=""(?<id>\d{5,})""", RegexOptions.IgnoreCase)]
    private static partial Regex HtmlVideoIdRegex();

    private sealed class TikTokOEmbedPayload
    {
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("author_name")]
        public string? AuthorName { get; set; }

        [JsonPropertyName("author_unique_id")]
        public string? AuthorUniqueId { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [JsonPropertyName("embed_product_id")]
        public string? EmbedProductId { get; set; }

        [JsonPropertyName("html")]
        public string? Html { get; set; }
    }
}
