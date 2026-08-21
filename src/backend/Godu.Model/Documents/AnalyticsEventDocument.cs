namespace Godu.Model.Documents;

public sealed class AnalyticsEventDocument
{
    public const int SchemaVersionValue = 1;

    public required string Id { get; init; }

    public required string PartitionKey { get; init; }

    public int SchemaVersion { get; init; } = SchemaVersionValue;

    public required DateTime Timestamp { get; init; }

    public required string EventName { get; init; }

    public string? UserId { get; init; }

    public required string AnonymousId { get; init; }

    public required string SessionId { get; init; }

    public string? GoduId { get; init; }

    public string? Platform { get; init; }

    public string? SourceCreatorHandle { get; init; }

    public string? Referrer { get; init; }

    public string? Path { get; init; }

    public string? UserAgent { get; init; }

    public required string Environment { get; init; }

    public bool IsInternal { get; init; }

    public Dictionary<string, object?>? Properties { get; init; }
}
