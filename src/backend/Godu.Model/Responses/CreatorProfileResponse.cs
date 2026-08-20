namespace Godu.Model.Responses;

public sealed class CreatorProfileResponse
{
    public required string UserId { get; init; }

    public required string DisplayName { get; init; }

    public required IReadOnlyList<CreatorSocialResponse> Socials { get; init; }

    public IReadOnlyList<PublicStepsSummaryResponse> PublishedSteps { get; init; } = [];
}
