using FluentAssertions;
using Godu.Model.Configuration;
using Godu.Model.Creators;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Microsoft.Extensions.Options;
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
            _entitlement.Object,
            Options.Create(new CreatorMonetisationOptions { MonthlyPriceGbp = 9.99m }));
    }

    [Fact]
    public async Task GetMineAsync_WhenExpired_ThenMapsEntitlementAndPrice()
    {
        Authenticate("usr_1");
        var ends = new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc);
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1"));
        _entitlement
            .Setup(e => e.Evaluate(It.IsAny<UserDocument>(), It.IsAny<DateTime?>()))
            .Returns(new CreatorEntitlement
            {
                Status = CreatorSubscriptionStatus.Expired,
                TrialStartedAt = ends.AddMonths(-3),
                TrialEndsAt = ends,
                HasActiveEntitlement = false,
                TrialClockSkipped = false,
            });

        var me = await _sut.GetMineAsync();

        me.UserId.Should().Be("usr_1");
        me.CanPublishPublic.Should().BeFalse();
        me.MonthlyPriceGbp.Should().Be(9.99m);
        me.Entitlement.Status.Should().Be(CreatorSubscriptionMapper.Expired);
        me.Entitlement.TrialEndsAt.Should().Be(ends);
        me.Entitlement.CanPublishPublic.Should().BeFalse();
        me.Entitlement.HasActiveEntitlement.Should().BeFalse();
    }

    [Fact]
    public async Task GetMineAsync_WhenNotStarted_ThenCanPublishPublic()
    {
        Authenticate("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1"));
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
        me.Entitlement.Status.Should().Be(CreatorSubscriptionMapper.NotStarted);
        me.Entitlement.CanPublishPublic.Should().BeTrue();
        me.Entitlement.TrialEndsAt.Should().BeNull();
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
