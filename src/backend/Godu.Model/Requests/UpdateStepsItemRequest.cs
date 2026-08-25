using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class UpdateStepsItemRequest
{
    [Required]
    [MinLength(1)]
    public required string Title { get; set; }

    public string? Description { get; set; }

    public string? CreatorDisplayName { get; set; }

    public string? Slug { get; set; }

    public bool ContinuousSoundtrack { get; set; }

    [Range(0, 600)]
    public int? GapSeconds { get; set; }

    [MaxLength(200)]
    public string? GapMessage { get; set; }

    public bool PlayGapPriorToStart { get; set; }

    [Range(0, 600)]
    public int? StartGapSeconds { get; set; }

    [MaxLength(200)]
    public string? StartGapMessage { get; set; }

    /// <summary>
    /// How many times to run the full step sequence. Null means a single pass.
    /// </summary>
    [Range(2, 99)]
    public int? RepeatCount { get; set; }

    /// <summary>False for a cards-only Godu with no TikTok. Defaults to true.</summary>
    public bool UseVideoContent { get; set; } = true;

    public VideoReferenceRequest? Video { get; set; }

    [Required]
    [MinLength(1)]
    public required List<StepDefinitionRequest> Steps { get; set; }
}
