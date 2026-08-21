using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Responses;
using Godu.Repository.Analytics;
using Godu.Service.Identity;
using Microsoft.Extensions.Options;

namespace Godu.Service.Analytics;

public sealed class AnalyticsSummaryService : IAnalyticsSummaryService
{
    private readonly IAnalyticsEventRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly AnalyticsOptions _options;

    public AnalyticsSummaryService(
        IAnalyticsEventRepository repository,
        ICurrentUser currentUser,
        IOptions<AnalyticsOptions> options)
    {
        _repository = repository;
        _currentUser = currentUser;
        _options = options.Value;
    }

    public async Task<AnalyticsSummaryResponse> SummarizeAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        string? environment,
        CancellationToken cancellationToken = default)
    {
        RequireAdmin();
        if (toUtcExclusive <= fromUtc)
        {
            throw new ArgumentException("The end date must be after the start date.");
        }

        var env = string.IsNullOrWhiteSpace(environment) ? ResolveEnvironment() : environment.Trim();
        var events = await _repository
            .ListInRangeAsync(fromUtc, toUtcExclusive, env, cancellationToken)
            .ConfigureAwait(false);
        var visible = events.Where(item => !item.IsInternal).ToList();

        var createStartedSessions = Sessions(visible, AnalyticsEventNames.CreateStarted);
        var savedSessions = Sessions(visible, AnalyticsEventNames.GoduSaved);
        var startedSessions = Sessions(visible, AnalyticsEventNames.GoduStarted);
        var completedSessions = Sessions(visible, AnalyticsEventNames.GoduCompleted);
        var createdByIdentity = DistinctGodusByIdentity(visible, AnalyticsEventNames.GoduSaved);
        var usedByIdentity = DistinctSessionsByIdentity(visible, AnalyticsEventNames.GoduStarted);

        var creators = createdByIdentity.Count;
        var repeatCreators = createdByIdentity.Count(pair => pair.Value >= 2);
        var consumers = usedByIdentity.Count;
        var repeatConsumers = usedByIdentity.Count(pair => pair.Value >= 2);
        var creationAbandoned = SessionsWithout(
            visible,
            AnalyticsEventNames.CreateStarted,
            AnalyticsEventNames.GoduSaved);
        var usageAbandoned = SessionsWithout(
            visible,
            AnalyticsEventNames.GoduStarted,
            AnalyticsEventNames.GoduCompleted);

        return new AnalyticsSummaryResponse
        {
            FromUtc = fromUtc,
            ToUtc = toUtcExclusive,
            Environment = env,
            UniqueVisitors = visible.Select(item => item.AnonymousId).Distinct(StringComparer.Ordinal).Count(),
            RegisteredUsers = visible
                .Select(item => item.UserId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .Count(),
            GoduCreationStarted = Count(visible, AnalyticsEventNames.CreateStarted),
            GodusCreated = DistinctGodus(visible, AnalyticsEventNames.GoduSaved),
            CreationConversionRate = Rate(savedSessions, createStartedSessions),
            GodusViewed = Count(visible, AnalyticsEventNames.GoduViewed),
            GodusStarted = startedSessions,
            GodusCompleted = completedSessions,
            CompletionRate = Rate(completedSessions, startedSessions),
            Shares = Count(visible, AnalyticsEventNames.ShareClicked),
            ReturningUsers = CountReturning(visible),
            RepeatCreators = repeatCreators,
            RepeatCreatorRate = Rate(repeatCreators, creators),
            RepeatConsumers = repeatConsumers,
            RepeatConsumerRate = Rate(repeatConsumers, consumers),
            UsersCreatingFirstGodu = createdByIdentity.Count(pair => pair.Value == 1),
            UsersCreatingSecondGodu = createdByIdentity.Count(pair => pair.Value >= 2),
            SecondCreationRate = Rate(createdByIdentity.Count(pair => pair.Value >= 2), creators),
            UsersUsingFirstGodu = usedByIdentity.Count(pair => pair.Value == 1),
            UsersUsingSecondGodu = usedByIdentity.Count(pair => pair.Value >= 2),
            SecondUsageRate = Rate(usedByIdentity.Count(pair => pair.Value >= 2), consumers),
            CreationAbandoned = creationAbandoned,
            CreationAbandonRate = Rate(creationAbandoned, createStartedSessions),
            UsageAbandoned = usageAbandoned,
            UsageAbandonRate = Rate(usageAbandoned, startedSessions),
        };
    }

    private void RequireAdmin()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        if (_options.IsAdminUser(_currentUser.UserId) || _options.AllowAnyAuthenticatedAdmin)
        {
            return;
        }

        throw new UnauthorizedAccessException("Admin access required.");
    }

    private string ResolveEnvironment() =>
        string.IsNullOrWhiteSpace(_options.Environment) ? "Development" : _options.Environment.Trim();

    private static int Count(IEnumerable<AnalyticsEventDocument> events, string name) =>
        events.Count(item => item.EventName == name);

    private static int Sessions(IEnumerable<AnalyticsEventDocument> events, string name) =>
        events
            .Where(item => item.EventName == name)
            .Select(item => item.SessionId)
            .Distinct(StringComparer.Ordinal)
            .Count();

    private static int SessionsWithout(
        IEnumerable<AnalyticsEventDocument> events,
        string started,
        string finished)
    {
        var startedSessions = events
            .Where(item => item.EventName == started)
            .Select(item => item.SessionId)
            .ToHashSet(StringComparer.Ordinal);
        var finishedSessions = events
            .Where(item => item.EventName == finished)
            .Select(item => item.SessionId)
            .ToHashSet(StringComparer.Ordinal);
        return startedSessions.Count(session => !finishedSessions.Contains(session));
    }

    private static int DistinctGodus(IEnumerable<AnalyticsEventDocument> events, string name)
    {
        var named = events.Where(item => item.EventName == name).ToList();
        var withId = named
            .Select(item => item.GoduId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .Count();
        return withId > 0 ? withId : named.Count;
    }

    private static Dictionary<string, int> DistinctGodusByIdentity(
        IEnumerable<AnalyticsEventDocument> events,
        string name)
    {
        return events
            .Where(item => item.EventName == name && !string.IsNullOrWhiteSpace(item.GoduId))
            .GroupBy(Identity, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.GoduId!).Distinct(StringComparer.Ordinal).Count(),
                StringComparer.Ordinal);
    }

    private static Dictionary<string, int> DistinctSessionsByIdentity(
        IEnumerable<AnalyticsEventDocument> events,
        string name)
    {
        return events
            .Where(item => item.EventName == name)
            .GroupBy(Identity, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.SessionId).Distinct(StringComparer.Ordinal).Count(),
                StringComparer.Ordinal);
    }

    private static int CountReturning(IReadOnlyList<AnalyticsEventDocument> events)
    {
        return events
            .GroupBy(Identity, StringComparer.Ordinal)
            .Count(group => group.Select(item => item.Timestamp.Date).Distinct().Count() >= 2);
    }

    private static string Identity(AnalyticsEventDocument item) =>
        string.IsNullOrWhiteSpace(item.UserId) ? item.AnonymousId : item.UserId;

    private static double Rate(int numerator, int denominator) =>
        denominator == 0 ? 0 : Math.Round(numerator * 100d / denominator, 1);
}
