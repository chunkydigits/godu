namespace Godu.Model.Responses;

public sealed class SavedGoduResponse
{
    public required string GoduId { get; init; }

    public required string Title { get; init; }

    public string? CreatorDisplayName { get; init; }

    public required string PlayPath { get; init; }

    public string? Category { get; init; }

    public DateTime SavedUtc { get; init; }
}
