namespace Godu.Model.Documents;

public sealed class StepsItemDocument
{
    public required string Id { get; init; }

    public required string CreatedByUserId { get; init; }

    public string? LinkedPlatformAccountId { get; set; }

    public required string Visibility { get; set; }

    public required string Status { get; set; }

    public string? Slug { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public string? CreatorDisplayName { get; set; }

    public required VideoReferenceDocument Video { get; set; }

    public required List<StepDefinitionDocument> Steps { get; set; }

    public bool ContinuousSoundtrack { get; set; }

    public int? GapSeconds { get; set; }

    public string? GapMessage { get; set; }

    /// <summary>
    /// When true, Start plays a gap (the first clip as a demo) before the first timer.
    /// </summary>
    public bool PlayGapPriorToStart { get; set; }

    /// <summary>
    /// Optional start-gap length. When set, overrides <see cref="GapSeconds"/> for the intro.
    /// </summary>
    public int? StartGapSeconds { get; set; }

    /// <summary>
    /// Optional start-gap copy. When set, overrides <see cref="GapMessage"/> for the intro.
    /// </summary>
    public string? StartGapMessage { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }

    public DateTime? PublishedUtc { get; set; }
}
