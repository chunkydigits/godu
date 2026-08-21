using FluentAssertions;
using Godu.Model.PlayHistory;
using Godu.Model.Requests;
using Godu.Repository.PlayHistory;
using Godu.Service.Identity;
using Godu.Service.PlayHistory;

namespace Godu.Service.Tests.PlayHistory;

public sealed class PlayHistoryServiceTests
{
    private readonly InMemoryPlayHistoryRepository _history = new();
    private readonly CurrentUser _currentUser = new() { IsAuthenticated = true, UserId = "usr_ada" };
    private readonly PlayHistoryService _sut;

    public PlayHistoryServiceTests()
    {
        _sut = new PlayHistoryService(_currentUser, _history);
    }

    [Fact]
    public async Task RecordAsync_WhenUnauthenticated_ThenThrows()
    {
        _currentUser.IsAuthenticated = false;

        var act = () => _sut.RecordAsync(StartedRequest());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task RecordAsync_WhenFirstStart_ThenCreatesEntry()
    {
        var saved = await _sut.RecordAsync(StartedRequest());

        saved.GoduId.Should().Be("steps_1");
        saved.StartedCount.Should().Be(1);
        saved.CompletedCount.Should().Be(0);
        saved.PlayPath.Should().Be("/t/coach/mobility");
        saved.Source.Should().Be(PlayHistorySources.Public);
    }

    [Fact]
    public async Task RecordAsync_WhenStartedAgain_ThenIncrementsAndBumpsToTop()
    {
        await _sut.RecordAsync(StartedRequest("steps_old", "/play/steps_old"));
        await _sut.RecordAsync(StartedRequest());
        await _sut.RecordAsync(StartedRequest());

        var list = await _sut.ListMineAsync();

        list.Should().HaveCount(2);
        list[0].GoduId.Should().Be("steps_1");
        list[0].StartedCount.Should().Be(2);
        list[1].GoduId.Should().Be("steps_old");
    }

    [Fact]
    public async Task RecordAsync_WhenCompletedWithoutStart_ThenCountsAsStarted()
    {
        var saved = await _sut.RecordAsync(StartedRequest() with { Event = PlayHistoryEvents.Completed });

        saved.StartedCount.Should().Be(1);
        saved.CompletedCount.Should().Be(1);
        saved.LastCompletedUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task RecordAsync_WhenInvalidPath_ThenThrows()
    {
        var act = () => _sut.RecordAsync(StartedRequest() with { PlayPath = "https://evil.example/x" });

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ListMineAsync_WhenEmpty_ThenReturnsEmpty()
    {
        var list = await _sut.ListMineAsync();

        list.Should().BeEmpty();
    }

    private static RecordPlayHistoryRequest StartedRequest(
        string goduId = "steps_1",
        string playPath = "/t/coach/mobility") =>
        new()
        {
            GoduId = goduId,
            Title = "Morning mobility",
            CreatorDisplayName = "@coach",
            PlayPath = playPath,
            Source = PlayHistorySources.Public,
            Event = PlayHistoryEvents.Started,
        };
}
