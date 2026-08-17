using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class VideoReferenceRequest
{
    [Required]
    public required string Provider { get; set; }

    [Required]
    public required string ExternalVideoId { get; set; }

    [Required]
    [Url]
    public required string SourceUrl { get; set; }

    public string? CreatorExternalAccountId { get; set; }

    public string? CreatorUsername { get; set; }

    public string? ThumbnailUrl { get; set; }

    public double? DurationSeconds { get; set; }
}
