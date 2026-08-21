namespace Godu.Model.Documents;

public sealed class PlayHistoryDocument
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string GoduId { get; init; }

    public required string Title { get; set; }

    public string? CreatorDisplayName { get; set; }

    public required string PlayPath { get; set; }

    public required string Source { get; set; }

    public int StartedCount { get; set; }

    public int CompletedCount { get; set; }

    public DateTime LastStartedUtc { get; set; }

    public DateTime? LastCompletedUtc { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }
}
