namespace Godu.Model.Responses;

public sealed class StepDefinitionResponse
{
    public required string Id { get; init; }

    public required int Order { get; init; }

    /// <summary>"step" or "gap".</summary>
    public required string Kind { get; init; }

    /// <summary>Empty on gap entries.</summary>
    public required string Title { get; init; }

    public string? Description { get; init; }

    public required double StartSeconds { get; init; }

    public required double EndSeconds { get; init; }

    public int? DurationSeconds { get; init; }

    public bool AutoAdvance { get; init; }

    /// <summary>Gap entries only: copy shown while the gap counts down.</summary>
    public string? Message { get; init; }
}
