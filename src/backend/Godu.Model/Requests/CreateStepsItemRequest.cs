using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class CreateStepsItemRequest
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

    [Required]
    public required VideoReferenceRequest Video { get; set; }

    [Required]
    [MinLength(1)]
    public required List<StepDefinitionRequest> Steps { get; set; }
}
