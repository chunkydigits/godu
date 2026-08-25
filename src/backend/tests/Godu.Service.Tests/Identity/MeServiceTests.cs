using FluentAssertions;
using Godu.Model.Creators;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Moq;

namespace Godu.Service.Tests.Identity;

public sealed class MeServiceTests
{
    private readonly Mock<ICurrentUser> _currentUser = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IAdminAccessService> _admin = new();
    private readonly Mock<ICreatorEntitlementService> _entitlement = new();
    private readonly MeService _sut;

    public MeServiceTests()
    {
        _admin
            .Setup(a => a.IsCurrentUserAdminAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _admin
            .Setup(a => a.IsEffectiveInternal(It.IsAny<UserDocument>()))
            .Returns(false);
        _sut = new MeService(
            _currentUser.Object,
            _users.Object,
            _admin.Object,
            _entitlement.Object);
    }

    [Fact]
    public async Task GetMineAsync_WhenAuthenticated_ThenIncludesCanPublishPublic()
    {
        Authenticate("usr_1");
        var user = User("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _entitlement
            .Setup(e => e.Evaluate(It.IsAny<UserDocument>(), It.IsAny<DateTime?>()))
            .Returns(new CreatorEntitlement
            {
                Status = CreatorSubscriptionStatus.Expired,
                HasActiveEntitlement = false,
                TrialClockSkipped = false,
            });

        var me = await _sut.GetMineAsync();

        me.UserId.Should().Be("usr_1");
        me.CanPublishPublic.Should().BeFalse();
    }

    [Fact]
    public async Task GetMineAsync_WhenNotStarted_ThenCanPublishPublic()
    {
        Authenticate("usr_1");
        var user = User("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _entitlement
            .Setup(e => e.Evaluate(It.IsAny<UserDocument>(), It.IsAny<DateTime?>()))
            .Returns(new CreatorEntitlement
            {
                Status = CreatorSubscriptionStatus.NotStarted,
                HasActiveEntitlement = false,
                TrialClockSkipped = false,
            });

        var me = await _sut.GetMineAsync();

        me.CanPublishPublic.Should().BeTrue();
    }

    [Fact]
    public async Task GetMineAsync_WhenNotAuthenticated_ThenThrows()
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(false);

        var act = () => _sut.GetMineAsync();

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    private void Authenticate(string userId)
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns(userId);
    }

    private static UserDocument User(string id) =>
        new()
        {
            Id = id,
            DisplayName = id,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
