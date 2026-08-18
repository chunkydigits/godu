namespace Godu.Model.Responses;

public sealed class StepsItemResponse
{
    public required string Id { get; init; }

    public required string CreatedByUserId { get; init; }

    public string? LinkedPlatformAccountId { get; init; }

    public required string Visibility { get; init; }

    public required string Status { get; init; }

    public string? Slug { get; init; }

    public required string Title { get; init; }

    public string? Description { get; init; }

    public string? CreatorDisplayName { get; init; }

    public required VideoReferenceResponse Video { get; init; }

    public required IReadOnlyList<StepDefinitionResponse> Steps { get; init; }

    public bool ContinuousSoundtrack { get; init; }

    public int? GapSeconds { get; init; }

    public string? GapMessage { get; init; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; init; }

    public DateTime? PublishedUtc { get; init; }
}
