namespace Godu.Model.Responses;

public sealed class VideoReferenceResponse
{
    public required string Provider { get; init; }

    public required string ExternalVideoId { get; init; }

    public required string SourceUrl { get; init; }

    public string? CreatorExternalAccountId { get; init; }

    public string? CreatorUsername { get; init; }

    public string? ThumbnailUrl { get; init; }

    public double? DurationSeconds { get; init; }
}
