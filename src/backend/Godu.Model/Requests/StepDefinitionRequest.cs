using System.ComponentModel.DataAnnotations;
using Godu.Model.Documents;

namespace Godu.Model.Requests;

public sealed class StepDefinitionRequest
{
    public string? Id { get; set; }

    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    /// <summary>"step" or "gap"; treated as "step" when omitted.</summary>
    public string? Kind { get; set; }

    /// <summary>Required for steps; gaps have no title. Enforced by kind.</summary>
    public string? Title { get; set; }

    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public double StartSeconds { get; set; }

    [Range(0, double.MaxValue)]
    public double EndSeconds { get; set; }

    [Range(1, int.MaxValue)]
    public int? DurationSeconds { get; set; }

    public bool AutoAdvance { get; set; }

    /// <summary>Null means loop (legacy payloads). False plays the clip once on untimed steps.</summary>
    public bool? LoopVideo { get; set; }

    [MaxLength(StepEntryKinds.GapMessageMaxLength)]
    public string? Message { get; set; }
}
