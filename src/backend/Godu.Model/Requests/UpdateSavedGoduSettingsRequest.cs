using Godu.Model.Playback;

namespace Godu.Model.Requests;

public sealed class UpdateSavedGoduSettingsRequest
{
    public GoduPlaybackSettings? UserSettings { get; set; }
}
