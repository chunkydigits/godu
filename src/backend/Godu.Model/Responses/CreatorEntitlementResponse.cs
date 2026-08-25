namespace Godu.Model.Responses;

public sealed class CreatorEntitlementResponse
{
    public required string Status { get; init; }

    public DateTime? TrialStartedAt { get; init; }

    public DateTime? TrialEndsAt { get; init; }

    public DateTime? SubscriptionStartedAt { get; init; }

    public DateTime? SubscriptionEndsAt { get; init; }

    public bool HasActiveEntitlement { get; init; }

    public bool TrialClockSkipped { get; init; }

    public bool CanPublishPublic { get; init; }
}
