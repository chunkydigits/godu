using System.Text.Json;
using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.Analytics;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Godu.Utility;
using Microsoft.Extensions.Options;

namespace Godu.Service.Analytics;

public sealed class AnalyticsIngestService : IAnalyticsIngestService
{
    private static readonly HashSet<string> BlockedPropertyKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "email",
        "name",
        "displayName",
        "ip",
        "ipAddress",
        "sub",
        "accessToken",
        "refreshToken",
        "auth0Id",
        "tiktokId",
    };

    private readonly IAnalyticsEventRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly IUserRepository _users;
    private readonly AnalyticsOptions _options;

    public AnalyticsIngestService(
        IAnalyticsEventRepository repository,
        ICurrentUser currentUser,
        IUserRepository users,
        IOptions<AnalyticsOptions> options)
    {
        _repository = repository;
        _currentUser = currentUser;
        _users = users;
        _options = options.Value;
    }

    public async Task IngestAsync(
        IngestAnalyticsEventRequest request,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var eventName = request.EventName?.Trim() ?? string.Empty;
        if (!AnalyticsEventNames.IsKnown(eventName))
        {
            throw new ArgumentException("Unknown analytics event.");
        }

        var anonymousId = RequireId(request.AnonymousId, "anonymousId");
        var sessionId = RequireId(request.SessionId, "sessionId");
        var timestamp = DateTime.UtcNow;
        var userId = _currentUser.IsAuthenticated ? _currentUser.UserId : null;
        var isInternal = _options.IsInternalUser(userId);
        if (!isInternal && !string.IsNullOrWhiteSpace(userId))
        {
            var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
            isInternal = user?.IsInternal == true;
        }

        var document = new AnalyticsEventDocument
        {
            Id = IdGenerator.NewAnalyticsEventId(),
            PartitionKey = timestamp.ToString("yyyy-MM"),
            SchemaVersion = AnalyticsEventDocument.SchemaVersionValue,
            Timestamp = timestamp,
            EventName = eventName,
            UserId = userId,
            AnonymousId = anonymousId,
            SessionId = sessionId,
            GoduId = Truncate(request.GoduId, 80),
            Platform = Truncate(request.Platform, 40),
            SourceCreatorHandle = Truncate(request.SourceCreatorHandle, 80),
            Referrer = Truncate(request.Referrer, 2048),
            Path = Truncate(request.Path, 512),
            UserAgent = Truncate(userAgent, 256),
            Environment = ResolveEnvironment(),
            IsInternal = isInternal,
            Properties = SanitizeProperties(request.Properties),
        };

        await _repository.CreateAsync(document, cancellationToken).ConfigureAwait(false);
    }

    private string ResolveEnvironment() =>
        string.IsNullOrWhiteSpace(_options.Environment) ? "Development" : _options.Environment.Trim();

    private static string RequireId(string? value, string field)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ArgumentException($"{field} is required.");
        }

        return trimmed.Length <= 80 ? trimmed : trimmed[..80];
    }

    private static string? Truncate(string? value, int max)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }

    private static Dictionary<string, object?>? SanitizeProperties(Dictionary<string, JsonElement>? source)
    {
        if (source is null || source.Count == 0)
        {
            return null;
        }

        var result = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var pair in source.Take(24))
        {
            var key = pair.Key.Trim();
            if (key.Length == 0 || key.Length > 40 || BlockedPropertyKeys.Contains(key))
            {
                continue;
            }

            result[key] = ToPrimitive(pair.Value);
        }

        return result.Count == 0 ? null : result;
    }

    private static object? ToPrimitive(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.String => Truncate(element.GetString(), 200),
            JsonValueKind.Number when element.TryGetInt64(out var whole) => whole,
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => Truncate(element.GetRawText(), 200),
        };
}
