namespace Godu.Model.Documents;

public sealed class VideoReferenceDocument
{
    public required string Provider { get; set; }

    public required string ExternalVideoId { get; set; }

    public required string SourceUrl { get; set; }

    public string? CreatorExternalAccountId { get; set; }

    public string? CreatorUsername { get; set; }

    public string? ThumbnailUrl { get; set; }

    public double? DurationSeconds { get; set; }
}
