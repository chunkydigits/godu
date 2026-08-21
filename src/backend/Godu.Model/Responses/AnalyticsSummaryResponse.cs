namespace Godu.Model.Responses;

public sealed class AnalyticsSummaryResponse
{
    public required DateTime FromUtc { get; init; }

    public required DateTime ToUtc { get; init; }

    public required string Environment { get; init; }

    public int UniqueVisitors { get; init; }

    public int RegisteredUsers { get; init; }

    public int GoduCreationStarted { get; init; }

    public int GodusCreated { get; init; }

    public double CreationConversionRate { get; init; }

    public int GodusViewed { get; init; }

    public int GodusStarted { get; init; }

    public int GodusCompleted { get; init; }

    public double CompletionRate { get; init; }

    public int Shares { get; init; }

    public int ReturningUsers { get; init; }

    public int RepeatCreators { get; init; }

    public double RepeatCreatorRate { get; init; }

    public int RepeatConsumers { get; init; }

    public double RepeatConsumerRate { get; init; }

    public int UsersCreatingFirstGodu { get; init; }

    public int UsersCreatingSecondGodu { get; init; }

    public double SecondCreationRate { get; init; }

    public int UsersUsingFirstGodu { get; init; }

    public int UsersUsingSecondGodu { get; init; }

    public double SecondUsageRate { get; init; }
}
