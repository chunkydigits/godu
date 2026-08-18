namespace Godu.Model.Requests;

public sealed class UpdateUserSettingsRequest
{
    public required bool UseVoiceCuesByDefault { get; init; }
}
