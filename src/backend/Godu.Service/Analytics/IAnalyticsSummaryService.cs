using Godu.Model.Responses;

namespace Godu.Service.Analytics;

public interface IAnalyticsSummaryService
{
    Task<AnalyticsSummaryResponse> SummarizeAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        string? environment,
        CancellationToken cancellationToken = default);
}
