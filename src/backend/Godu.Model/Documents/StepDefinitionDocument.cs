namespace Godu.Model.Documents;

public sealed class StepDefinitionDocument
{
    public required string Id { get; init; }

    public required int Order { get; set; }

    /// <summary>
    /// Entry kind: "step" or "gap". Absent on entries saved before gaps existed,
    /// which are activity steps.
    /// </summary>
    public string Kind { get; set; } = StepEntryKinds.Step;

    /// <summary>Empty on gap entries, which have no title of their own.</summary>
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public required double StartSeconds { get; set; }

    public required double EndSeconds { get; set; }

    /// <summary>Activity length, or the rest length on a gap entry.</summary>
    public int? DurationSeconds { get; set; }

    public bool AutoAdvance { get; set; }

    /// <summary>
    /// Untimed steps only. When false, the clip plays once then holds on the step copy.
    /// Defaults to true (loop). Timed steps always loop the clip while the timer runs.
    /// </summary>
    public bool LoopVideo { get; set; } = true;

    /// <summary>Gap entries only: copy shown while the gap counts down.</summary>
    public string? Message { get; set; }
}
