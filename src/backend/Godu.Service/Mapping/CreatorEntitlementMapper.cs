using Godu.Model.Creators;
using Godu.Model.Responses;

namespace Godu.Service.Mapping;

public static class CreatorEntitlementMapper
{
    public static CreatorEntitlementResponse ToResponse(CreatorEntitlement entitlement) =>
        new()
        {
            Status = CreatorSubscriptionMapper.StatusName(entitlement.Status),
            TrialStartedAt = entitlement.TrialStartedAt,
            TrialEndsAt = entitlement.TrialEndsAt,
            SubscriptionStartedAt = entitlement.SubscriptionStartedAt,
            SubscriptionEndsAt = entitlement.SubscriptionEndsAt,
            HasActiveEntitlement = entitlement.HasActiveEntitlement,
            TrialClockSkipped = entitlement.TrialClockSkipped,
            CanPublishPublic = entitlement.CanPublishPublic,
        };
}
