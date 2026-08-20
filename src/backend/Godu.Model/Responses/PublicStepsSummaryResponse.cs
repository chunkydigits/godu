namespace Godu.Model.Responses;

public sealed class PublicStepsSummaryResponse
{
    public required string Id { get; init; }

    public required string Title { get; init; }

    public string? Description { get; init; }

    public required string Slug { get; init; }

    public required string Provider { get; init; }

    public required string Username { get; init; }

    public required int StepCount { get; init; }

    public string? PublicPath { get; init; }
}
