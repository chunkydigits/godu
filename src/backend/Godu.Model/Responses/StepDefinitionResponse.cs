namespace Godu.Model.Responses;

public sealed class StepDefinitionResponse
{
    public required string Id { get; init; }

    public required int Order { get; init; }

    public required string Title { get; init; }

    public string? Description { get; init; }

    public required double StartSeconds { get; init; }

    public required double EndSeconds { get; init; }

    public int? DurationSeconds { get; init; }

    public bool AutoAdvance { get; init; }
}
