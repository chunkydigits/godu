namespace Godu.Model.Responses;

public sealed class MeResponse
{
    public required string UserId { get; init; }

    public required string DisplayName { get; init; }

    public bool IsAdmin { get; init; }

    public bool IsInternal { get; init; }

    public bool CanPublishPublic { get; init; }

    public decimal MonthlyPriceGbp { get; init; }

    public required CreatorEntitlementResponse Entitlement { get; init; }
}
