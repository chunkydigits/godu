using FluentAssertions;
using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.Analytics;
using Godu.Service.Analytics;
using Godu.Service.Identity;
using Microsoft.Extensions.Options;
using Moq;

namespace Godu.Service.Tests.Analytics;

public sealed class AnalyticsIngestServiceTests
{
    private readonly InMemoryAnalyticsEventRepository _repository = new();
    private readonly Mock<ICurrentUser> _currentUser = new();
    private readonly AnalyticsOptions _options = new() { Environment = "Development" };
    private readonly AnalyticsIngestService _sut;

    public AnalyticsIngestServiceTests()
    {
        _sut = new AnalyticsIngestService(
            _repository,
            _currentUser.Object,
            Options.Create(_options));
    }

    [Fact]
    public async Task IngestAsync_WhenUnknownEvent_ThenThrows()
    {
        var act = () => _sut.IngestAsync(ValidRequest(eventName: "not_a_real_event"), "agent");

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task IngestAsync_WhenValid_ThenStoresServerTimestampAndEnvironment()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);

        await _sut.IngestAsync(ValidRequest(), "Mozilla/5.0");

        var stored = await _repository.ListInRangeAsync(
            before,
            DateTime.UtcNow.AddMinutes(1),
            "Development");
        stored.Should().ContainSingle();
        stored[0].EventName.Should().Be(AnalyticsEventNames.GoduStarted);
        stored[0].UserId.Should().BeNull();
        stored[0].Timestamp.Should().BeOnOrAfter(before);
        stored[0].Environment.Should().Be("Development");
        stored[0].PartitionKey.Should().Be(stored[0].Timestamp.ToString("yyyy-MM"));
        stored[0].Id.Should().StartWith("evt_");
    }

    [Fact]
    public async Task IngestAsync_WhenAuthenticated_ThenUsesInternalUserIdNotRequest()
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns("usr_internal");

        await _sut.IngestAsync(ValidRequest(), null);

        var stored = await _repository.ListInRangeAsync(
            DateTime.UtcNow.AddMinutes(-1),
            DateTime.UtcNow.AddMinutes(1),
            "Development");
        stored.Should().ContainSingle();
        stored[0].UserId.Should().Be("usr_internal");
    }

    [Fact]
    public async Task IngestAsync_WhenInternalUser_ThenFlagsIsInternal()
    {
        _options.InternalUserIds = ["usr_andy"];
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns("usr_andy");

        await _sut.IngestAsync(ValidRequest(), null);

        var stored = await _repository.ListInRangeAsync(
            DateTime.UtcNow.AddMinutes(-1),
            DateTime.UtcNow.AddMinutes(1),
            "Development");
        stored[0].IsInternal.Should().BeTrue();
    }

    private static IngestAnalyticsEventRequest ValidRequest(string eventName = AnalyticsEventNames.GoduStarted) =>
        new()
        {
            EventName = eventName,
            AnonymousId = "anon-1",
            SessionId = "session-1",
            GoduId = "steps_1",
            Platform = "tiktok",
        };
}

public sealed class AnalyticsSummaryServiceTests
{
    private readonly InMemoryAnalyticsEventRepository _repository = new();
    private readonly Mock<ICurrentUser> _currentUser = new();
    private readonly AnalyticsOptions _options = new()
    {
        Environment = "Development",
        AllowAnyAuthenticatedAdmin = true,
    };
    private readonly AnalyticsSummaryService _sut;

    public AnalyticsSummaryServiceTests()
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns("usr_admin");
        _sut = new AnalyticsSummaryService(
            _repository,
            _currentUser.Object,
            Options.Create(_options));
    }

    [Fact]
    public async Task SummarizeAsync_WhenNotAdmin_ThenThrows()
    {
        var sut = new AnalyticsSummaryService(
            _repository,
            _currentUser.Object,
            Options.Create(new AnalyticsOptions
            {
                Environment = "Production",
                AllowAnyAuthenticatedAdmin = false,
            }));

        var act = () => sut.SummarizeAsync(DateTime.UtcNow.AddDays(-7), DateTime.UtcNow, "Production");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task SummarizeAsync_ComputesUniqueVisitorsCompletionAndRepeatMetrics()
    {
        var day1 = new DateTime(2026, 8, 1, 12, 0, 0, DateTimeKind.Utc);
        var day2 = new DateTime(2026, 8, 2, 12, 0, 0, DateTimeKind.Utc);

        await Seed(AnalyticsEventNames.PageViewed, "anon-a", "s1", day1);
        await Seed(AnalyticsEventNames.PageViewed, "anon-b", "s2", day1);
        await Seed(AnalyticsEventNames.CreateStarted, "anon-a", "s1", day1);
        await Seed(AnalyticsEventNames.CreateStarted, "anon-c", "s5", day1);
        await Seed(AnalyticsEventNames.GoduSaved, "anon-a", "s1", day1, "steps_1", "usr_1");
        await Seed(AnalyticsEventNames.GoduSaved, "anon-a", "s3", day2, "steps_2", "usr_1");
        await Seed(AnalyticsEventNames.GoduStarted, "anon-b", "s2", day1, "steps_1");
        await Seed(AnalyticsEventNames.GoduCompleted, "anon-b", "s2", day1, "steps_1");
        await Seed(AnalyticsEventNames.GoduStarted, "anon-b", "s4", day2, "steps_2");
        await Seed(AnalyticsEventNames.GoduStarted, "anon-a", "s1", day1, "steps_1", "usr_1");
        await Seed(
            AnalyticsEventNames.PageViewed,
            "anon-internal",
            "si",
            day1,
            isInternal: true);

        var summary = await _sut.SummarizeAsync(day1, day2.AddDays(1), "Development");

        summary.UniqueVisitors.Should().Be(3);
        summary.GodusCreated.Should().Be(2);
        summary.GodusStarted.Should().Be(3);
        summary.GodusCompleted.Should().Be(1);
        summary.CompletionRate.Should().Be(33.3);
        summary.RepeatCreators.Should().Be(1);
        summary.RepeatConsumers.Should().Be(1);
        summary.ReturningUsers.Should().Be(2);
        summary.UsersCreatingSecondGodu.Should().Be(1);
        summary.CreationAbandoned.Should().Be(1);
        summary.CreationAbandonRate.Should().Be(50);
        summary.UsageAbandoned.Should().Be(2);
        summary.UsageAbandonRate.Should().Be(66.7);
        summary.ActiveUsers.Should().Be(4);
        summary.ReturnRate7Day.Should().Be(50);
        summary.CreationFunnel.Should().HaveCount(6);
        summary.CreationFunnel[1].Count.Should().Be(2);
        summary.CreationFunnel[4].Label.Should().Be("Saved");
        summary.CreationFunnel[4].Count.Should().Be(2);
        summary.UsageFunnel.Select(step => step.Count).Should().Equal(0, 3, 1);
        summary.UsageFunnel[2].ConversionFromStart.Should().Be(33.3);
        summary.Daily.Should().HaveCount(3);
        summary.Daily[0].Date.Should().Be("2026-08-01");
        summary.Daily[0].Visitors.Should().Be(3);
        summary.Daily[1].GodusCreated.Should().Be(1);
        summary.Daily[2].Visitors.Should().Be(0);
    }

    private async Task Seed(
        string eventName,
        string anonymousId,
        string sessionId,
        DateTime timestamp,
        string? goduId = null,
        string? userId = null,
        bool isInternal = false)
    {
        await _repository.CreateAsync(new AnalyticsEventDocument
        {
            Id = Guid.NewGuid().ToString("N"),
            PartitionKey = timestamp.ToString("yyyy-MM"),
            Timestamp = timestamp,
            EventName = eventName,
            AnonymousId = anonymousId,
            SessionId = sessionId,
            GoduId = goduId,
            UserId = userId,
            Environment = "Development",
            IsInternal = isInternal,
        });
    }
}
