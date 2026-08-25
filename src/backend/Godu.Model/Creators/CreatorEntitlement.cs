using Godu.Model.Enums;

namespace Godu.Model.Creators;

public sealed class CreatorEntitlement
{
    public required CreatorSubscriptionStatus Status { get; init; }

    public DateTime? TrialStartedAt { get; init; }

    public DateTime? TrialEndsAt { get; init; }

    public DateTime? SubscriptionStartedAt { get; init; }

    public DateTime? SubscriptionEndsAt { get; init; }

    public bool HasActiveEntitlement { get; init; }

    public bool TrialClockSkipped { get; init; }

    public bool CanPublishPublic =>
        HasActiveEntitlement || Status == CreatorSubscriptionStatus.NotStarted;
}
