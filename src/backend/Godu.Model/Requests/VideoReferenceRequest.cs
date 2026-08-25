namespace Godu.Model.Requests;

public sealed class VideoReferenceRequest
{
    public string? Provider { get; init; }

    public string? ExternalVideoId { get; init; }

    public string? SourceUrl { get; init; }

    public string? CreatorExternalAccountId { get; init; }

    public string? CreatorUsername { get; init; }

    public string? ThumbnailUrl { get; init; }

    public double? DurationSeconds { get; init; }
}
