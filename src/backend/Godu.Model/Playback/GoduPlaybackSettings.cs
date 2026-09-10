namespace Godu.Model.Playback;

/// <summary>Playback recommendations from a creator, or overrides saved by a viewer.</summary>
public sealed class GoduPlaybackSettings
{
    public bool? ClipAudio { get; set; }

    public bool? VoiceCues { get; set; }

    public bool? TimingBeeps { get; set; }

    public int? TimingBeepSeconds { get; set; }
}
