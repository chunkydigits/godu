using FluentAssertions;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Microsoft.Extensions.Options;

namespace Godu.Service.Tests.Creators;

public sealed class CreatorEntitlementServiceTests
{
    private readonly InMemoryUserRepository _users = new();
    private readonly AnalyticsOptions _options = new() { AllowAnyAuthenticatedAdmin = true };
    private readonly CreatorEntitlementService _sut;

    public CreatorEntitlementServiceTests()
    {
        var admin = new AdminAccessService(
            new CurrentUser(),
            _users,
            Options.Create(_options));
        _sut = new CreatorEntitlementService(_users, admin);
    }

    [Fact]
    public async Task StartTrialIfNeededAsync_WhenFirstPublish_ThenStoresThreeCalendarMonths()
    {
        await Seed("usr_ada");
        var published = new DateTime(2026, 1, 31, 12, 0, 0, DateTimeKind.Utc);

        await _sut.StartTrialIfNeededAsync("usr_ada", published);

        var stored = await _users.GetByIdAsync("usr_ada");
        stored.Should().NotBeNull();
        stored!.CreatorSubscriptionStatus.Should().Be(CreatorSubscriptionMapper.Trial);
        stored.TrialStartedAt.Should().Be(published);
        stored.TrialEndsAt.Should().Be(new DateTime(2026, 4, 30, 12, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task StartTrialIfNeededAsync_WhenAlreadyStarted_ThenDoesNotExtend()
    {
        await Seed("usr_ada");
        var first = new DateTime(2026, 2, 1, 8, 0, 0, DateTimeKind.Utc);
        await _sut.StartTrialIfNeededAsync("usr_ada", first);

        await _sut.StartTrialIfNeededAsync("usr_ada", first.AddDays(10));

        var stored = await _users.GetByIdAsync("usr_ada");
        stored!.TrialStartedAt.Should().Be(first);
        stored.TrialEndsAt.Should().Be(first.AddMonths(3));
    }

    [Fact]
    public async Task StartTrialIfNeededAsync_WhenAdmin_ThenSkipsClock()
    {
        await Seed("usr_admin", isAdmin: true);

        await _sut.StartTrialIfNeededAsync("usr_admin", DateTime.UtcNow);

        var stored = await _users.GetByIdAsync("usr_admin");
        stored!.TrialStartedAt.Should().BeNull();
        stored.CreatorSubscriptionStatus.Should().Be(CreatorSubscriptionMapper.NotStarted);
        _sut.Evaluate(stored).HasActiveEntitlement.Should().BeTrue();
        _sut.Evaluate(stored).TrialClockSkipped.Should().BeTrue();
    }

    [Fact]
    public async Task StartTrialIfNeededAsync_WhenInternal_ThenSkipsClock()
    {
        await Seed("usr_staff", isInternal: true);

        await _sut.StartTrialIfNeededAsync("usr_staff", DateTime.UtcNow);

        var stored = await _users.GetByIdAsync("usr_staff");
        stored!.TrialStartedAt.Should().BeNull();
        _sut.Evaluate(stored).HasActiveEntitlement.Should().BeTrue();
    }

    [Fact]
    public async Task StartTrialIfNeededAsync_WhenConfiguredAdmin_ThenSkipsClock()
    {
        _options.AdminUserIds = ["usr_cfg"];
        await Seed("usr_cfg");

        await _sut.StartTrialIfNeededAsync("usr_cfg", DateTime.UtcNow);

        var stored = await _users.GetByIdAsync("usr_cfg");
        stored!.TrialStartedAt.Should().BeNull();
        _sut.Evaluate(stored).TrialClockSkipped.Should().BeTrue();
    }

    [Fact]
    public void Evaluate_WhenAllowAnyAuthenticatedAdmin_ThenStillMetersOrdinaryUsers()
    {
        var user = User("usr_ada");

        var entitlement = _sut.Evaluate(user);

        entitlement.TrialClockSkipped.Should().BeFalse();
        entitlement.HasActiveEntitlement.Should().BeFalse();
        entitlement.Status.Should().Be(CreatorSubscriptionStatus.NotStarted);
        entitlement.CanPublishPublic.Should().BeTrue();
    }

    [Fact]
    public void Evaluate_WhenTrialInDate_ThenEntitled()
    {
        var now = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Trial;
        user.TrialStartedAt = now.AddDays(-10);
        user.TrialEndsAt = now.AddMonths(3);

        var entitlement = _sut.Evaluate(user, now);

        entitlement.Status.Should().Be(CreatorSubscriptionStatus.Trial);
        entitlement.HasActiveEntitlement.Should().BeTrue();
        entitlement.CanPublishPublic.Should().BeTrue();
    }

    [Fact]
    public void Evaluate_WhenTrialEnded_ThenExpired()
    {
        var now = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Trial;
        user.TrialStartedAt = now.AddMonths(-4);
        user.TrialEndsAt = now.AddDays(-1);

        var entitlement = _sut.Evaluate(user, now);

        entitlement.Status.Should().Be(CreatorSubscriptionStatus.Expired);
        entitlement.HasActiveEntitlement.Should().BeFalse();
        entitlement.CanPublishPublic.Should().BeFalse();
    }

    [Fact]
    public void Evaluate_WhenCancelledButPeriodOpen_ThenEntitled()
    {
        var now = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Cancelled;
        user.TrialStartedAt = now.AddMonths(-6);
        user.TrialEndsAt = now.AddMonths(-3);
        user.SubscriptionEndsAt = now.AddDays(5);

        var entitlement = _sut.Evaluate(user, now);

        entitlement.Status.Should().Be(CreatorSubscriptionStatus.Cancelled);
        entitlement.HasActiveEntitlement.Should().BeTrue();
        entitlement.CanPublishPublic.Should().BeTrue();
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenMissing_ThenThrows()
    {
        var act = () => _sut.GetByUserIdAsync("usr_missing");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task HasPublicEntitlementAsync_WhenMissingUser_ThenFalse()
    {
        var allowed = await _sut.HasPublicEntitlementAsync("usr_missing");

        allowed.Should().BeFalse();
    }

    [Fact]
    public async Task HasPublicEntitlementAsync_WhenExpired_ThenFalse()
    {
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Expired;
        user.TrialStartedAt = DateTime.UtcNow.AddMonths(-4);
        user.TrialEndsAt = DateTime.UtcNow.AddDays(-1);
        await _users.CreateAsync(user);

        var allowed = await _sut.HasPublicEntitlementAsync("usr_ada");

        allowed.Should().BeFalse();
    }

    [Fact]
    public async Task HasPublicEntitlementAsync_WhenTrialInDate_ThenTrue()
    {
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Trial;
        user.TrialStartedAt = DateTime.UtcNow.AddMonths(-1);
        user.TrialEndsAt = DateTime.UtcNow.AddMonths(2);
        await _users.CreateAsync(user);

        var allowed = await _sut.HasPublicEntitlementAsync("usr_ada");

        allowed.Should().BeTrue();
    }

    [Fact]
    public async Task HasPublicEntitlementAsync_WhenAdminNotStarted_ThenTrue()
    {
        await Seed("usr_admin", isAdmin: true);

        var allowed = await _sut.HasPublicEntitlementAsync("usr_admin");

        allowed.Should().BeTrue();
    }

    [Fact]
    public async Task CanPublishPublicAsync_WhenNotStarted_ThenTrue()
    {
        await Seed("usr_ada");

        var allowed = await _sut.CanPublishPublicAsync("usr_ada");

        allowed.Should().BeTrue();
    }

    [Fact]
    public async Task CanPublishPublicAsync_WhenExpired_ThenFalse()
    {
        var user = User("usr_ada");
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Expired;
        user.TrialStartedAt = DateTime.UtcNow.AddMonths(-4);
        user.TrialEndsAt = DateTime.UtcNow.AddDays(-1);
        await _users.CreateAsync(user);

        var allowed = await _sut.CanPublishPublicAsync("usr_ada");

        allowed.Should().BeFalse();
    }

    [Fact]
    public async Task CanPublishPublicAsync_WhenMissingUser_ThenFalse()
    {
        var allowed = await _sut.CanPublishPublicAsync("usr_missing");

        allowed.Should().BeFalse();
    }

    private async Task Seed(string id, bool isAdmin = false, bool isInternal = false)
    {
        await _users.CreateAsync(User(id, isAdmin, isInternal));
    }

    private static UserDocument User(string id, bool isAdmin = false, bool isInternal = false) =>
        new()
        {
            Id = id,
            DisplayName = id,
            IsAdmin = isAdmin,
            IsInternal = isInternal,
            CreatorSubscriptionStatus = CreatorSubscriptionMapper.NotStarted,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
