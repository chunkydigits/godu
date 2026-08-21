using Godu.Model.Requests;

namespace Godu.Service.Analytics;

public interface IAnalyticsIngestService
{
    Task IngestAsync(
        IngestAnalyticsEventRequest request,
        string? userAgent,
        CancellationToken cancellationToken = default);
}
