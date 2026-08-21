using Godu.Model.Documents;

namespace Godu.Repository.Analytics;

public interface IAnalyticsEventRepository
{
    Task CreateAsync(AnalyticsEventDocument document, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AnalyticsEventDocument>> ListInRangeAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        string environment,
        CancellationToken cancellationToken = default);
}
