namespace Godu.Model.Documents;

public sealed class StepDefinitionDocument
{
    public required string Id { get; init; }

    public required int Order { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public required double StartSeconds { get; set; }

    public required double EndSeconds { get; set; }

    public int? DurationSeconds { get; set; }

    public bool AutoAdvance { get; set; }
}
