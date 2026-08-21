using FluentAssertions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.Creators;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.PlatformAccounts;
using Moq;

namespace Godu.Service.Tests.Creators;

public sealed class CreatorProfileServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ILinkedPlatformAccountRepository> _accounts = new();
    private readonly Mock<ICreatorRepository> _creators = new();
    private readonly Mock<IStepsItemRepository> _steps = new();
    private readonly Mock<ICreatorService> _creatorService = new();
    private readonly Mock<ILinkedPlatformAccountService> _platformAccounts = new();
    private readonly Mock<ICurrentUser> _currentUser = new();
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
            _steps.Object,
            _creatorService.Object,
            _platformAccounts.Object,
            _currentUser.Object);
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
    public async Task GetPublicAsync_WhenCreatorHasNoBioOrImage_ThenFallsBackToLinkedAccount()
    {
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTok("usr_1", "coach", "https://tiktok.example/avatar.jpg", "Coach bio")]);

        var profile = await _sut.GetPublicAsync("usr_1");

        profile.ProfileImageUrl.Should().Be("https://tiktok.example/avatar.jpg");
        profile.Bio.Should().Be("Coach bio");
    }

    [Fact]
    public async Task GetPublicAsync_WhenCreatorHasBioAndImage_ThenPrefersCreatorOverLinkedAccount()
    {
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _creators
            .Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreatorDocument
            {
                Id = "creator_1",
                UserId = "usr_1",
                DisplayName = "Ada the Coach",
                Bio = "Custom bio",
                ProfileImageUrl = "https://godu.example/me.png",
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow,
            });
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTok("usr_1", "coach", "https://tiktok.example/avatar.jpg", "TikTok bio")]);

        var profile = await _sut.GetPublicAsync("usr_1");

        profile.DisplayName.Should().Be("Ada the Coach");
        profile.Bio.Should().Be("Custom bio");
        profile.ProfileImageUrl.Should().Be("https://godu.example/me.png");
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

    [Fact]
    public async Task GetPublicByHandleAsync_WhenCurrentOwnerExists_ThenPrefersCurrentHandle()
    {
        var current = TikTok("usr_b", "oldname");
        _accounts
            .Setup(r => r.GetVerifiedByCurrentUsernameAsync("tiktok", "oldname", It.IsAny<CancellationToken>()))
            .ReturnsAsync(current);
        _users
            .Setup(r => r.GetByIdAsync("usr_b", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_b", "New Owner"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_b", It.IsAny<CancellationToken>()))
            .ReturnsAsync([current]);

        var profile = await _sut.GetPublicByHandleAsync("t", "oldname");

        profile.UserId.Should().Be("usr_b");
        profile.Socials[0].Username.Should().Be("oldname");
    }

    [Fact]
    public async Task GetPublicByHandleAsync_WhenOnlyAliasMatches_ThenReturnsPreviousOwner()
    {
        var previous = TikTok("usr_a", "newname");
        previous.UsernameAliases = ["oldname"];
        _accounts
            .Setup(r => r.GetVerifiedByCurrentUsernameAsync("tiktok", "oldname", It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument?)null);
        _accounts
            .Setup(r => r.ListVerifiedByAliasAsync("tiktok", "oldname", It.IsAny<CancellationToken>()))
            .ReturnsAsync([previous]);
        _users
            .Setup(r => r.GetByIdAsync("usr_a", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_a", "Previous"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_a", It.IsAny<CancellationToken>()))
            .ReturnsAsync([previous]);

        var profile = await _sut.GetPublicByHandleAsync("t", "oldname");

        profile.UserId.Should().Be("usr_a");
        profile.Socials[0].Username.Should().Be("newname");
    }

    [Fact]
    public async Task GetMineAsync_WhenNotAuthenticated_ThenThrows()
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(false);

        var act = () => _sut.GetMineAsync();

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateMineAsync_WhenAuthenticated_ThenPersistsFields()
    {
        Authenticate("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTok("usr_1", "coach")]);
        _creatorService
            .Setup(s => s.UpdateForUserAsync(
                "usr_1",
                "Ada the Coach",
                "Hello from Godu",
                "https://cdn.example/me.png",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreatorDocument
            {
                Id = "creator_1",
                UserId = "usr_1",
                DisplayName = "Ada the Coach",
                Bio = "Hello from Godu",
                ProfileImageUrl = "https://cdn.example/me.png",
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow,
            })
            .Callback(() =>
            {
                _creators
                    .Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new CreatorDocument
                    {
                        Id = "creator_1",
                        UserId = "usr_1",
                        DisplayName = "Ada the Coach",
                        Bio = "Hello from Godu",
                        ProfileImageUrl = "https://cdn.example/me.png",
                        CreatedUtc = DateTime.UtcNow,
                        UpdatedUtc = DateTime.UtcNow,
                    });
            });

        var profile = await _sut.UpdateMineAsync(new UpdateCreatorProfileRequest
        {
            DisplayName = "Ada the Coach",
            Bio = "Hello from Godu",
            ProfileImageUrl = "https://cdn.example/me.png",
        });

        profile.DisplayName.Should().Be("Ada the Coach");
        profile.Bio.Should().Be("Hello from Godu");
        profile.ProfileImageUrl.Should().Be("https://cdn.example/me.png");
    }

    [Fact]
    public async Task ImportMineFromSocialAsync_WhenVerifiedAccount_ThenCopiesLiveNameBioAndImage()
    {
        Authenticate("usr_1");
        _users
            .Setup(r => r.GetByIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User("usr_1", "Ada"));
        _accounts
            .Setup(r => r.ListByUserAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTok("usr_1", "coach", "https://tiktok.example/old.jpg", "Old bio", "Coach Ada")]);
        _platformAccounts
            .Setup(s => s.RefreshVerifiedMetadataAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LinkedPlatformAccountResponse
            {
                Id = "pa_1",
                UserId = "usr_1",
                Provider = "tiktok",
                ExternalAccountId = "oid",
                Username = "coach",
                DisplayName = "Coach Ada",
                AvatarUrl = "https://tiktok.example/new.jpg",
                Bio = "New TikTok bio",
                IsVerified = true,
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow,
            });
        _creatorService
            .Setup(s => s.UpdateForUserAsync(
                "usr_1",
                "Coach Ada",
                "New TikTok bio",
                "https://tiktok.example/new.jpg",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreatorDocument
            {
                Id = "creator_1",
                UserId = "usr_1",
                DisplayName = "Coach Ada",
                Bio = "New TikTok bio",
                ProfileImageUrl = "https://tiktok.example/new.jpg",
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow,
            })
            .Callback(() =>
            {
                _creators
                    .Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new CreatorDocument
                    {
                        Id = "creator_1",
                        UserId = "usr_1",
                        DisplayName = "Coach Ada",
                        Bio = "New TikTok bio",
                        ProfileImageUrl = "https://tiktok.example/new.jpg",
                        CreatedUtc = DateTime.UtcNow,
                        UpdatedUtc = DateTime.UtcNow,
                    });
            });

        var profile = await _sut.ImportMineFromSocialAsync();

        profile.DisplayName.Should().Be("Coach Ada");
        profile.Bio.Should().Be("New TikTok bio");
        profile.ProfileImageUrl.Should().Be("https://tiktok.example/new.jpg");
    }

    private void Authenticate(string userId)
    {
        _currentUser.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUser.SetupGet(c => c.UserId).Returns(userId);
    }

    private static UserDocument User(string id, string name) =>
        new()
        {
            Id = id,
            DisplayName = name,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

    private static LinkedPlatformAccountDocument TikTok(
        string userId,
        string username,
        string? avatarUrl = null,
        string? bio = null,
        string? displayName = null) =>
        new()
        {
            Id = "pa_1",
            UserId = userId,
            Provider = "tiktok",
            ExternalAccountId = "oid",
            Username = username,
            DisplayName = displayName,
            ProfileUrl = $"https://www.tiktok.com/@{username}",
            AvatarUrl = avatarUrl,
            Bio = bio,
            IsVerified = true,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
}
