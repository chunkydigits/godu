using FluentAssertions;
using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Repository.Analytics;
using Godu.Repository.Users;
using Godu.Service.Analytics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Godu.Service.Tests.Analytics;

public sealed class AnalyticsRecorderTests
{
    private readonly InMemoryAnalyticsEventRepository _repository = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly AnalyticsOptions _options = new() { Environment = "Development" };
    private readonly AnalyticsRecorder _sut;

    public AnalyticsRecorderTests()
    {
        _sut = new AnalyticsRecorder(
            _repository,
            _users,
            Options.Create(_options),
            NullLogger<AnalyticsRecorder>.Instance);
    }

    [Fact]
    public async Task RecordForUserAsync_WhenValid_ThenStoresServerOriginAndUserId()
    {
        await _users.CreateAsync(User("usr_ada"));

        var storedOk = await _sut.RecordForUserAsync(
            "usr_ada",
            AnalyticsEventNames.CreatorTrialStarted,
            "steps_1",
            "tiktok");

        storedOk.Should().BeTrue();
        var stored = await _repository.ListInRangeAsync(
            DateTime.UtcNow.AddMinutes(-1),
            DateTime.UtcNow.AddMinutes(1),
            "Development");
        stored.Should().ContainSingle();
        stored[0].EventName.Should().Be(AnalyticsEventNames.CreatorTrialStarted);
        stored[0].UserId.Should().Be("usr_ada");
        stored[0].GoduId.Should().Be("steps_1");
        stored[0].Platform.Should().Be("tiktok");
        stored[0].AnonymousId.Should().Be("server:usr_ada");
        stored[0].SessionId.Should().Be("server:usr_ada");
        stored[0].IsInternal.Should().BeFalse();
    }

    [Fact]
    public async Task RecordForUserAsync_WhenUnknownEvent_ThenReturnsFalse()
    {
        var storedOk = await _sut.RecordForUserAsync("usr_ada", "not_a_real_event");

        storedOk.Should().BeFalse();
    }

    [Fact]
    public async Task RecordForUserAsync_WhenRepositoryThrows_ThenReturnsFalse()
    {
        var repository = new Mock<IAnalyticsEventRepository>();
        repository
            .Setup(r => r.CreateAsync(It.IsAny<AnalyticsEventDocument>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("cosmos down"));
        var sut = new AnalyticsRecorder(
            repository.Object,
            _users,
            Options.Create(_options),
            NullLogger<AnalyticsRecorder>.Instance);

        var storedOk = await sut.RecordForUserAsync("usr_ada", AnalyticsEventNames.TrialExpired);

        storedOk.Should().BeFalse();
    }

    [Fact]
    public async Task RecordForUserAsync_WhenInternalUser_ThenFlagsIsInternal()
    {
        await _users.CreateAsync(User("usr_staff", isInternal: true));

        await _sut.RecordForUserAsync("usr_staff", AnalyticsEventNames.TikTokAccountConnected, platform: "tiktok");

        var stored = await _repository.ListInRangeAsync(
            DateTime.UtcNow.AddMinutes(-1),
            DateTime.UtcNow.AddMinutes(1),
            "Development");
        stored[0].IsInternal.Should().BeTrue();
    }

    private static UserDocument User(string id, bool isInternal = false) =>
        new()
        {
            Id = id,
            DisplayName = id,
            IsInternal = isInternal,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
