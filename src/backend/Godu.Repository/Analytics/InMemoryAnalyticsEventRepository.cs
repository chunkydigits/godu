using System.Collections.Concurrent;
using Godu.Model.Documents;

namespace Godu.Repository.Analytics;

public sealed class InMemoryAnalyticsEventRepository : IAnalyticsEventRepository
{
    private readonly ConcurrentDictionary<string, AnalyticsEventDocument> _store = new(StringComparer.Ordinal);

    public Task CreateAsync(AnalyticsEventDocument document, CancellationToken cancellationToken = default)
    {
        if (!_store.TryAdd(document.Id, Clone(document)))
        {
            throw new InvalidOperationException($"Analytics event already exists: {document.Id}");
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AnalyticsEventDocument>> ListInRangeAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        string environment,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(item =>
                item.Timestamp >= fromUtc
                && item.Timestamp < toUtcExclusive
                && string.Equals(item.Environment, environment, StringComparison.OrdinalIgnoreCase))
            .OrderBy(item => item.Timestamp)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<AnalyticsEventDocument>>(items);
    }

    private static AnalyticsEventDocument Clone(AnalyticsEventDocument document) =>
        new()
        {
            Id = document.Id,
            PartitionKey = document.PartitionKey,
            SchemaVersion = document.SchemaVersion,
            Timestamp = document.Timestamp,
            EventName = document.EventName,
            UserId = document.UserId,
            AnonymousId = document.AnonymousId,
            SessionId = document.SessionId,
            GoduId = document.GoduId,
            Platform = document.Platform,
            SourceCreatorHandle = document.SourceCreatorHandle,
            Referrer = document.Referrer,
            Path = document.Path,
            UserAgent = document.UserAgent,
            Environment = document.Environment,
            IsInternal = document.IsInternal,
            Properties = document.Properties is null ? null : new Dictionary<string, object?>(document.Properties),
        };
}
