using FluentAssertions;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Email;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Godu.Service.Tests.Email;

public sealed class TrialExpiryMailServiceTests
{
    private readonly InMemoryUserRepository _users = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly TrialExpiryMailService _sut;
    private readonly DateTime _now = new(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

    public TrialExpiryMailServiceTests()
    {
        _email.SetupGet(e => e.IsConfigured).Returns(true);
        _email
            .Setup(e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var admin = new AdminAccessService(
            new CurrentUser(),
            _users,
            Options.Create(new AnalyticsOptions()));
        _sut = new TrialExpiryMailService(
            _users,
            new CreatorEntitlementService(_users, admin),
            _email.Object,
            Options.Create(new CreatorMonetisationOptions { MonthlyPriceGbp = 9.99m }),
            NullLogger<TrialExpiryMailService>.Instance);
    }

    [Fact]
    public async Task ProcessDueAsync_WhenSevenDaysBeforeEnd_ThenSendsWarningOnce()
    {
        var ends = _now.AddDays(7);
        await Seed(TrialUser("usr_ada", ends, email: "ada@example.com"));

        await _sut.ProcessDueAsync(_now);
        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                "ada@example.com",
                It.Is<string>(s => s.Contains("7 days", StringComparison.OrdinalIgnoreCase)),
                It.Is<string>(b => b.Contains("8 June 2026") && b.Contains("£9.99")),
                It.IsAny<CancellationToken>()),
            Times.Once);
        var stored = await _users.GetByIdAsync("usr_ada");
        stored!.TrialWarningEmailSentAt.Should().NotBeNull();
        stored.TrialEndedEmailSentAt.Should().BeNull();
    }

    [Fact]
    public async Task ProcessDueAsync_WhenMoreThanSevenDaysRemain_ThenDoesNotSend()
    {
        await Seed(TrialUser("usr_ada", _now.AddDays(8), email: "ada@example.com"));

        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessDueAsync_WhenTrialEnded_ThenSendsEndEmailOnce()
    {
        await Seed(TrialUser("usr_ada", _now.AddMinutes(-1), email: "ada@example.com"));

        await _sut.ProcessDueAsync(_now);
        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                "ada@example.com",
                It.Is<string>(s => s.Contains("has ended", StringComparison.OrdinalIgnoreCase)),
                It.Is<string>(b => b.Contains("no longer visible") && b.Contains("£9.99")),
                It.IsAny<CancellationToken>()),
            Times.Once);
        var stored = await _users.GetByIdAsync("usr_ada");
        stored!.TrialEndedEmailSentAt.Should().NotBeNull();
        stored.TrialWarningEmailSentAt.Should().BeNull();
    }

    [Fact]
    public async Task ProcessDueAsync_WhenNoEmail_ThenSkipsWithoutMarkingSent()
    {
        await Seed(TrialUser("usr_ada", _now.AddDays(3), email: null));

        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
        var stored = await _users.GetByIdAsync("usr_ada");
        stored!.TrialWarningEmailSentAt.Should().BeNull();
    }

    [Fact]
    public async Task ProcessDueAsync_WhenAdmin_ThenSkips()
    {
        var user = TrialUser("usr_admin", _now.AddDays(3), email: "admin@example.com");
        user.IsAdmin = true;
        await Seed(user);

        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessDueAsync_WhenSendFails_ThenDoesNotMarkSent()
    {
        await Seed(TrialUser("usr_ada", _now.AddDays(3), email: "ada@example.com"));
        _email
            .Setup(e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("SES down"));

        await _sut.ProcessDueAsync(_now);

        var stored = await _users.GetByIdAsync("usr_ada");
        stored!.TrialWarningEmailSentAt.Should().BeNull();
    }

    [Fact]
    public async Task ProcessDueAsync_WhenNotConfigured_ThenDoesNotSend()
    {
        await Seed(TrialUser("usr_ada", _now.AddDays(3), email: "ada@example.com"));
        _email.SetupGet(e => e.IsConfigured).Returns(false);

        await _sut.ProcessDueAsync(_now);

        _email.Verify(
            e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private async Task Seed(UserDocument user) => await _users.CreateAsync(user);

    private UserDocument TrialUser(string id, DateTime trialEnds, string? email) =>
        new()
        {
            Id = id,
            DisplayName = id,
            Email = email,
            CreatorSubscriptionStatus = CreatorSubscriptionMapper.Trial,
            TrialStartedAt = trialEnds.AddMonths(-3),
            TrialEndsAt = trialEnds,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
