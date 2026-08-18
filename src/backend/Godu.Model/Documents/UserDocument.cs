namespace Godu.Model.Documents;

public sealed class UserDocument
{
    public required string Id { get; init; }

    public required string DisplayName { get; set; }

    /// <summary>When true, Steps playback starts with spoken cues and muted clip audio.</summary>
    public bool UseVoiceCuesByDefault { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }
}
