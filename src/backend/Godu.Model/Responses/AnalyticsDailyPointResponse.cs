namespace Godu.Model.Responses;

public sealed class AnalyticsDailyPointResponse
{
    public required string Date { get; init; }

    public int Visitors { get; init; }

    public int GodusCreated { get; init; }

    public int GodusStarted { get; init; }

    public int GodusCompleted { get; init; }
}
