using FluentAssertions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Moq;

namespace Godu.Service.Tests.Identity;

public sealed class UserSettingsServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ICurrentUser> _currentUser = new();
    private readonly UserSettingsService _sut;

    public UserSettingsServiceTests()
    {
        _sut = new UserSettingsService(_users.Object, _currentUser.Object);
    }

    [Fact]
    public async Task GetMineAsync_WhenAuthenticated_ThenReturnsStoredVoiceCueDefault()
    {
        Authenticate("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", useVoiceCuesByDefault: true));

        var settings = await _sut.GetMineAsync();

        settings.UseVoiceCuesByDefault.Should().BeTrue();
    }

    [Fact]
    public async Task GetMineAsync_WhenNotAuthenticated_ThenThrows()
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(false);

        var act = () => _sut.GetMineAsync();

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateMineAsync_ThenPersistsVoiceCueDefault()
    {
        Authenticate("usr_1");
        var stored = User("usr_1", useVoiceCuesByDefault: false);
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(stored);
        _users
            .Setup(r => r.UpdateAsync(It.IsAny<UserDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserDocument u, CancellationToken _) => u);

        var settings = await _sut.UpdateMineAsync(new UpdateUserSettingsRequest
        {
            UseVoiceCuesByDefault = true,
        });

        settings.UseVoiceCuesByDefault.Should().BeTrue();
        _users.Verify(
            r => r.UpdateAsync(
                It.Is<UserDocument>(u => u.Id == "usr_1" && u.UseVoiceCuesByDefault),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    private void Authenticate(string userId)
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns(userId);
    }

    private static UserDocument User(string id, bool useVoiceCuesByDefault) =>
        new()
        {
            Id = id,
            DisplayName = "Ada",
            UseVoiceCuesByDefault = useVoiceCuesByDefault,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
