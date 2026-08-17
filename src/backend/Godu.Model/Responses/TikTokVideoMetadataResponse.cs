namespace Godu.Model.Responses;

public sealed class TikTokVideoMetadataResponse
{
    /// <summary>
    /// TikTok oEmbed "title" — the public video caption.
    /// </summary>
    public required string Caption { get; init; }

    public string? AuthorName { get; init; }

    public string? AuthorUniqueId { get; init; }

    public string? ThumbnailUrl { get; init; }

    public string? ExternalVideoId { get; init; }

    public required string SourceUrl { get; init; }
}
