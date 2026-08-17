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

    [Required]
    public required VideoReferenceRequest Video { get; set; }

    [Required]
    [MinLength(1)]
    public required List<StepDefinitionRequest> Steps { get; set; }
}
