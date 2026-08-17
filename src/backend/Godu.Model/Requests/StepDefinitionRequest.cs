using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class StepDefinitionRequest
{
    public string? Id { get; set; }

    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    [Required]
    [MinLength(1)]
    public required string Title { get; set; }

    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public double StartSeconds { get; set; }

    [Range(0, double.MaxValue)]
    public double EndSeconds { get; set; }

    [Range(1, int.MaxValue)]
    public int? DurationSeconds { get; set; }

    public bool AutoAdvance { get; set; }
}
