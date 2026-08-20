using FluentAssertions;
using Godu.Model.Documents;
using Godu.Repository.Creators;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Moq;

namespace Godu.Service.Tests.Creators;

public sealed class CreatorProfileServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ILinkedPlatformAccountRepository> _accounts = new();
    private readonly Mock<ICreatorRepository> _creators = new();
    private readonly Mock<IStepsItemRepository> _steps = new();
    private readonly CreatorProfileService _sut;

    public CreatorProfileServiceTests()
    {
        _creators
            .Setup(r => r.GetByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument?)null);
        _steps
            .Setup(r => r.ListPublicByUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sut = new CreatorProfileService(
            _users.Object,
            _accounts.Object,
            _creators.Object,
            _steps.Object);
    }

    [Fact]
    public async Task GetPublicAsync_WhenOneSocial_ThenReturnsThatProfile()
    {
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTok("usr_1", "coach")]);

        var profile = await _sut.GetPublicAsync("usr_1");

        profile.DisplayName.Should().Be("Ada");
        profile.Socials.Should().ContainSingle();
        profile.Socials[0].Provider.Should().Be("tiktok");
        profile.Socials[0].Username.Should().Be("coach");
        profile.Socials[0].ProfileUrl.Should().Be("https://www.tiktok.com/@coach");
    }

    [Fact]
    public async Task GetPublicAsync_WhenNoSocials_ThenThrows()
    {
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var act = () => _sut.GetPublicAsync("usr_1");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    private static UserDocument User(string id, string name) =>
        new()
        {
            Id = id,
            DisplayName = name,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

    private static LinkedPlatformAccountDocument TikTok(string userId, string username) =>
        new()
        {
            Id = "pa_1",
            UserId = userId,
            Provider = "tiktok",
            ExternalAccountId = "oid",
            Username = username,
            ProfileUrl = $"https://www.tiktok.com/@{username}",
            IsVerified = true,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
