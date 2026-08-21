namespace Godu.Model.Responses;

public sealed class AnalyticsFunnelStepResponse
{
    public required string EventName { get; init; }

    public required string Label { get; init; }

    public int Count { get; init; }

    public double ConversionFromStart { get; init; }

    public double ConversionFromPrevious { get; init; }
}
