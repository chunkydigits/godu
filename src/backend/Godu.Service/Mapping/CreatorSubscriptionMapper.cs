using Godu.Model.Enums;

namespace Godu.Service.Mapping;

public static class CreatorSubscriptionMapper
{
    public const string NotStarted = "notStarted";
    public const string Trial = "trial";
    public const string Active = "active";
    public const string PastDue = "pastDue";
    public const string Cancelled = "cancelled";
    public const string Expired = "expired";

    public static string StatusName(CreatorSubscriptionStatus status) =>
        status switch
        {
            CreatorSubscriptionStatus.Trial => Trial,
            CreatorSubscriptionStatus.Active => Active,
            CreatorSubscriptionStatus.PastDue => PastDue,
            CreatorSubscriptionStatus.Cancelled => Cancelled,
            CreatorSubscriptionStatus.Expired => Expired,
            _ => NotStarted,
        };

    public static CreatorSubscriptionStatus ParseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return CreatorSubscriptionStatus.NotStarted;
        }

        return value.Trim() switch
        {
            Trial => CreatorSubscriptionStatus.Trial,
            Active => CreatorSubscriptionStatus.Active,
            PastDue => CreatorSubscriptionStatus.PastDue,
            Cancelled => CreatorSubscriptionStatus.Cancelled,
            Expired => CreatorSubscriptionStatus.Expired,
            _ => CreatorSubscriptionStatus.NotStarted,
        };
    }
}
