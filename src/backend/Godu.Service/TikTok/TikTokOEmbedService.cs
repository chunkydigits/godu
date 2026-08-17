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

        return new TikTokVideoMetadataResponse
        {
            Caption = payload.Title.Trim(),
            AuthorName = string.IsNullOrWhiteSpace(payload.AuthorName) ? null : payload.AuthorName.Trim(),
            AuthorUniqueId = string.IsNullOrWhiteSpace(payload.AuthorUniqueId)
                ? null
                : payload.AuthorUniqueId.Trim(),
            ThumbnailUrl = string.IsNullOrWhiteSpace(payload.ThumbnailUrl) ? null : payload.ThumbnailUrl.Trim(),
            ExternalVideoId = string.IsNullOrWhiteSpace(payload.EmbedProductId)
                ? null
                : payload.EmbedProductId.Trim(),
            SourceUrl = sourceUrl,
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
            sourceUrl = $"https://www.tiktok.com/@video/video/{trimmed}";
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

        var match = VideoPathRegex().Match(uri.AbsolutePath);
        if (!match.Success)
        {
            return false;
        }

        var username = match.Groups["user"].Value;
        var videoId = match.Groups["id"].Value;
        sourceUrl = $"https://www.tiktok.com/@{username}/video/{videoId}";
        return true;
    }

    private static bool IsAllowedTikTokHost(string host) =>
        host.Equals("tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("www.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("m.tiktok.com", StringComparison.OrdinalIgnoreCase)
        || host.Equals("vm.tiktok.com", StringComparison.OrdinalIgnoreCase);

    [GeneratedRegex(@"^\d{5,}$")]
    private static partial Regex BareVideoIdRegex();

    [GeneratedRegex(@"^/@(?<user>[^/]+)/video/(?<id>\d{5,})/?$", RegexOptions.IgnoreCase)]
    private static partial Regex VideoPathRegex();

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
    }
}
