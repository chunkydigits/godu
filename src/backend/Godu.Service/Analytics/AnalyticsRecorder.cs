using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Repository.Analytics;
using Godu.Repository.Users;
using Godu.Utility;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Godu.Service.Analytics;

public sealed class AnalyticsRecorder : IAnalyticsRecorder
{
    private readonly IAnalyticsEventRepository _repository;
    private readonly IUserRepository _users;
    private readonly AnalyticsOptions _options;
    private readonly ILogger<AnalyticsRecorder> _logger;

    public AnalyticsRecorder(
        IAnalyticsEventRepository repository,
        IUserRepository users,
        IOptions<AnalyticsOptions> options,
        ILogger<AnalyticsRecorder> logger)
    {
        _repository = repository;
        _users = users;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> RecordForUserAsync(
        string userId,
        string eventName,
        string? goduId = null,
        string? platform = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId) || !AnalyticsEventNames.IsKnown(eventName))
            {
                return false;
            }

            var timestamp = DateTime.UtcNow;
            var isInternal = _options.IsInternalUser(userId);
            if (!isInternal)
            {
                var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
                isInternal = user?.IsInternal == true;
            }

            var serverId = ServerId(userId);
            await _repository
                .CreateAsync(
                    new AnalyticsEventDocument
                    {
                        Id = IdGenerator.NewAnalyticsEventId(),
                        PartitionKey = timestamp.ToString("yyyy-MM"),
                        SchemaVersion = AnalyticsEventDocument.SchemaVersionValue,
                        Timestamp = timestamp,
                        EventName = eventName.Trim(),
                        UserId = userId.Trim(),
                        AnonymousId = serverId,
                        SessionId = serverId,
                        GoduId = Truncate(goduId, 80),
                        Platform = Truncate(platform, 40),
                        Environment = ResolveEnvironment(),
                        IsInternal = isInternal,
                    },
                    cancellationToken)
                .ConfigureAwait(false);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Failed to record {EventName} for {UserId}.", eventName, userId);
            return false;
        }
    }

    private string ResolveEnvironment() =>
        string.IsNullOrWhiteSpace(_options.Environment) ? "Development" : _options.Environment.Trim();

    private static string ServerId(string userId)
    {
        var value = AnalyticsEventNames.ServerAnonymousPrefix + userId.Trim();
        return value.Length <= 80 ? value : value[..80];
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
}
