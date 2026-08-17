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

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }

    public DateTime? PublishedUtc { get; set; }
}
