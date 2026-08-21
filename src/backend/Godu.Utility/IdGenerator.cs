namespace Godu.Utility;

public static class IdGenerator
{
    public static string NewUserId() => $"usr_{Ulid.NewUlid()}";

    public static string NewExternalIdentityId() => $"ext_{Ulid.NewUlid()}";

    public static string NewStepsItemId() => $"steps_{Ulid.NewUlid()}";

    public static string NewStepId() => $"step_{Ulid.NewUlid()}";

    public static string NewPlatformAccountId() => $"platform_{Ulid.NewUlid()}";

    public static string NewCreatorId() => $"creator_{Ulid.NewUlid()}";

    public static string NewAnalyticsEventId() => $"evt_{Ulid.NewUlid()}";

    public static string PlayHistoryId(string userId, string goduId) => $"hist_{userId}_{goduId}";
}
