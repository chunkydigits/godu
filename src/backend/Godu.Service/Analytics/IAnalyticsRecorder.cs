namespace Godu.Service.Analytics;

public interface IAnalyticsRecorder
{
    /// <summary>
    /// Trusted server-side write. Never throws except cancellation; returns false if not stored.
    /// </summary>
    Task<bool> RecordForUserAsync(
        string userId,
        string eventName,
        string? goduId = null,
        string? platform = null,
        CancellationToken cancellationToken = default);
}
