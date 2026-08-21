namespace Godu.Model.Responses;

public sealed class PlayHistoryResponse
{
    public required string GoduId { get; init; }

    public required string Title { get; init; }

    public string? CreatorDisplayName { get; init; }

    public required string PlayPath { get; init; }

    public required string Source { get; init; }

    public int StartedCount { get; init; }

    public int CompletedCount { get; init; }

    public DateTime LastStartedUtc { get; init; }

    public DateTime? LastCompletedUtc { get; init; }
}
