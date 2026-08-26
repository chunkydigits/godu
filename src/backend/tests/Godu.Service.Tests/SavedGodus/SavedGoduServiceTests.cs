using FluentAssertions;
using Godu.Model.Requests;
using Godu.Repository.SavedGodus;
using Godu.Service.Identity;
using Godu.Service.SavedGodus;

namespace Godu.Service.Tests.SavedGodus;

public sealed class SavedGoduServiceTests
{
    private readonly InMemorySavedGoduRepository _saved = new();
    private readonly CurrentUser _currentUser = new() { IsAuthenticated = true, UserId = "usr_ada" };
    private readonly SavedGoduService _sut;

    public SavedGoduServiceTests()
    {
        _sut = new SavedGoduService(_currentUser, _saved);
    }

    [Fact]
    public async Task SaveAsync_WhenUnauthenticated_ThenThrows()
    {
        _currentUser.IsAuthenticated = false;

        var act = () => _sut.SaveAsync(Request());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task SaveAsync_WhenNew_ThenStoresPointer()
    {
        var saved = await _sut.SaveAsync(Request());

        saved.GoduId.Should().Be("steps_1");
        saved.PlayPath.Should().Be("/t/coach/mobility");
        saved.Category.Should().Be("Train");
        saved.SavedUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task SaveAsync_WhenCategoryOmitted_ThenSavesWithoutOne()
    {
        var saved = await _sut.SaveAsync(Request() with { Category = "  " });

        saved.Category.Should().BeNull();
    }

    [Fact]
    public async Task SaveAsync_WhenAlreadySaved_ThenReturnsExistingWithoutChangingCategory()
    {
        await _sut.SaveAsync(Request());

        var again = await _sut.SaveAsync(Request() with { Category = "Cook", Title = "Changed" });

        again.Category.Should().Be("Train");
        again.Title.Should().Be("Morning mobility");
        (await _sut.ListMineAsync()).Should().HaveCount(1);
    }

    [Fact]
    public async Task SaveAsync_WhenInvalidPath_ThenThrows()
    {
        var act = () => _sut.SaveAsync(Request() with { PlayPath = "https://evil.example/x" });

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ListMineAsync_ReturnsEachSavedGodu()
    {
        await _sut.SaveAsync(Request("steps_old", "/play/steps_old"));
        await _sut.SaveAsync(Request());

        var list = await _sut.ListMineAsync();

        list.Select(item => item.GoduId).Should().BeEquivalentTo(["steps_1", "steps_old"]);
    }

    [Fact]
    public async Task RemoveAsync_WhenPresent_ThenDropsTheLink()
    {
        await _sut.SaveAsync(Request());

        await _sut.RemoveAsync("steps_1");

        (await _sut.ListMineAsync()).Should().BeEmpty();
    }

    [Fact]
    public async Task RemoveAsync_WhenMissing_ThenThrows()
    {
        var act = () => _sut.RemoveAsync("steps_missing");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    private static SaveGoduRequest Request(
        string goduId = "steps_1",
        string playPath = "/t/coach/mobility") =>
        new()
        {
            GoduId = goduId,
            Title = "Morning mobility",
            CreatorDisplayName = "@coach",
            PlayPath = playPath,
            Category = "Train",
        };
}
