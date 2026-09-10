namespace Godu.Model.Documents;

using Godu.Model.Playback;

public sealed class SavedGoduDocument
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string GoduId { get; init; }

    public required string Title { get; set; }

    public string? CreatorDisplayName { get; set; }

    public required string PlayPath { get; set; }

    public string? Category { get; set; }

    public GoduPlaybackSettings? UserSettings { get; set; }

    public DateTime SavedUtc { get; init; }
}
