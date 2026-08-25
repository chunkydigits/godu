using FluentAssertions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.StepsItems;
using Godu.Service.TikTok;
using Moq;

namespace Godu.Service.Tests.StepsItems;

public sealed class StepsItemServiceTests
{
    private readonly Mock<IStepsItemRepository> _repository = new();
    private readonly Mock<ILinkedPlatformAccountRepository> _accounts = new();
    private readonly Mock<ITikTokVideoOwnershipVerifier> _ownership = new();
    private readonly Mock<ICreatorService> _creators = new();
    private readonly Mock<ICreatorEntitlementService> _entitlement = new();
    private readonly CurrentUser _currentUser = new();
    private readonly StepsItemService _sut;

    public StepsItemServiceTests()
    {
        _accounts
            .Setup(r => r.ListByUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _accounts
            .Setup(r => r.GetVerifiedByCurrentUsernameAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument?)null);
        _accounts
            .Setup(r => r.ListVerifiedByAliasAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _entitlement
            .Setup(e => e.StartTrialIfNeededAsync(
                It.IsAny<string>(),
                It.IsAny<DateTime>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _entitlement
            .Setup(e => e.HasPublicEntitlementAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _entitlement
            .Setup(e => e.CanPublishPublicAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _sut = new StepsItemService(
            _repository.Object,
            _accounts.Object,
            _currentUser,
            _ownership.Object,
            _creators.Object,
            _entitlement.Object);
    }

    [Fact]
    public async Task CreateMineAsync_WhenAuthenticated_ThenOwnsCreatedItem()
    {
        Authenticate("usr_owner");
        StepsItemDocument? saved = null;
        _repository
            .Setup(r => r.CreateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) =>
            {
                saved = doc;
                return doc;
            });

        var result = await _sut.CreateMineAsync(ValidCreateRequest());

        result.CreatedByUserId.Should().Be("usr_owner");
        result.CreatorSocials.Should().ContainSingle(s =>
            s.Provider == "tiktok" && s.Username == "x");
        saved.Should().NotBeNull();
        saved!.CreatedByUserId.Should().Be("usr_owner");
        saved.Status.Should().Be("published");
        saved.Visibility.Should().Be("private");
    }

    [Fact]
    public async Task CreateMineAsync_WhenOwnerHasDifferentLinkedTikTok_ThenCreatorSocialsUseVideoCreator()
    {
        Authenticate("usr_owner");
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTokAccount(verified: true)]);
        _repository
            .Setup(r => r.CreateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) => doc);

        var result = await _sut.CreateMineAsync(ValidCreateRequest());

        result.Video.CreatorUsername.Should().Be("x");
        result.CreatorSocials.Should().ContainSingle(s =>
            s.Provider == "tiktok" && s.Username == "x");
    }

    [Fact]
    public async Task CreateMineAsync_WhenGapConfigured_ThenPersistsGapFields()
    {
        Authenticate("usr_owner");
        StepsItemDocument? saved = null;
        _repository
            .Setup(r => r.CreateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) =>
            {
                saved = doc;
                return doc;
            });

        var request = ValidCreateRequest();
        request.GapSeconds = 60;
        request.GapMessage = "  Active recovery  ";
        request.PlayGapPriorToStart = true;
        request.StartGapSeconds = 12;
        request.StartGapMessage = "  Watch the demo  ";
        request.RepeatCount = 5;
        request.Steps[0].LoopVideo = false;

        var result = await _sut.CreateMineAsync(request);

        saved.Should().NotBeNull();
        saved!.GapSeconds.Should().Be(60);
        saved.GapMessage.Should().Be("Active recovery");
        saved.PlayGapPriorToStart.Should().BeTrue();
        saved.StartGapSeconds.Should().Be(12);
        saved.StartGapMessage.Should().Be("Watch the demo");
        saved.RepeatCount.Should().Be(5);
        saved.Steps[0].LoopVideo.Should().BeFalse();
        result.GapSeconds.Should().Be(60);
        result.GapMessage.Should().Be("Active recovery");
        result.PlayGapPriorToStart.Should().BeTrue();
        result.StartGapSeconds.Should().Be(12);
        result.StartGapMessage.Should().Be("Watch the demo");
        result.RepeatCount.Should().Be(5);
        result.Steps[0].LoopVideo.Should().BeFalse();
    }

    [Fact]
    public async Task CreateMineAsync_WhenGapEntryIncluded_ThenPersistsGapEntry()
    {
        Authenticate("usr_owner");
        StepsItemDocument? saved = null;
        _repository
            .Setup(r => r.CreateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) =>
            {
                saved = doc;
                return doc;
            });

        var request = ValidCreateRequest();
        request.Steps.Add(new StepDefinitionRequest
        {
            Order = 2,
            Kind = "gap",
            DurationSeconds = 20,
            Message = "  Water break  ",
        });
        request.Steps.Add(new StepDefinitionRequest
        {
            Order = 3,
            Title = "Cool down",
            StartSeconds = 10,
            EndSeconds = 20,
            DurationSeconds = 10,
        });

        var result = await _sut.CreateMineAsync(request);

        saved.Should().NotBeNull();
        var gap = saved!.Steps.Single(s => s.Kind == "gap");
        gap.DurationSeconds.Should().Be(20);
        gap.Message.Should().Be("Water break");
        gap.Title.Should().BeEmpty();
        saved.Steps.Count(s => s.Kind == "step").Should().Be(2);
        result.Steps.Should().HaveCount(3);
        result.Steps[1].Kind.Should().Be("gap");
        result.Steps[1].Message.Should().Be("Water break");
    }

    [Fact]
    public async Task CreateMineAsync_WhenGapEntryLengthOutOfRange_ThenThrowsArgumentException()
    {
        Authenticate("usr_owner");
        var request = ValidCreateRequest();
        request.Steps.Add(new StepDefinitionRequest
        {
            Order = 2,
            Kind = "gap",
            DurationSeconds = 601,
        });

        var act = async () => await _sut.CreateMineAsync(request);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*durationSeconds must be between 1 and 600*");
    }

    [Fact]
    public async Task CreateMineAsync_WhenOnlyGapEntries_ThenThrowsArgumentException()
    {
        Authenticate("usr_owner");
        var request = ValidCreateRequest();
        request.Steps =
        [
            new StepDefinitionRequest { Order = 1, Kind = "gap", DurationSeconds = 20 },
        ];

        var act = async () => await _sut.CreateMineAsync(request);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*At least one step is required*");
    }

    [Fact]
    public async Task CreateMineAsync_WhenUnknownEntryKind_ThenThrowsArgumentException()
    {
        Authenticate("usr_owner");
        var request = ValidCreateRequest();
        request.Steps[0].Kind = "interval";

        var act = async () => await _sut.CreateMineAsync(request);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*unknown kind 'interval'*");
    }

    [Fact]
    public async Task CreateMineAsync_WhenNotAuthenticated_ThenThrowsUnauthorized()
    {
        var act = async () => await _sut.CreateMineAsync(ValidCreateRequest());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(
            r => r.CreateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateMineAsync_WhenStepEndBeforeStart_ThenThrowsArgumentException()
    {
        Authenticate("usr_owner");
        var request = ValidCreateRequest();
        request.Steps[0].EndSeconds = request.Steps[0].StartSeconds;

        var act = async () => await _sut.CreateMineAsync(request);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*endSeconds must be greater than startSeconds*");
    }

    [Fact]
    public async Task GetMineAsync_WhenItemBelongsToOtherUser_ThenThrowsNotFound()
    {
        Authenticate("usr_owner");
        _repository
            .Setup(r => r.GetByIdAsync("steps_1", "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument?)null);

        var act = async () => await _sut.GetMineAsync("steps_1");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ArchiveMineAsync_WhenOwner_ThenSetsArchivedStatus()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _repository
            .Setup(r => r.UpdateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) => doc);

        var result = await _sut.ArchiveMineAsync(existing.Id);

        result.Status.Should().Be("archived");
        _repository.Verify(
            r => r.UpdateAsync(It.Is<StepsItemDocument>(d => d.Status == "archived"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateMineAsync_WhenArchived_ThenThrowsInvalidOperation()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "archived");
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var act = async () => await _sut.UpdateMineAsync(existing.Id, ValidUpdateRequest());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Archived*");
    }

    [Fact]
    public async Task GetPublicAsync_WhenUnknownProviderAlias_ThenReturnsNull()
    {
        var result = await _sut.GetPublicAsync("unknown", "creator", "slug");

        result.Should().BeNull();
        _repository.Verify(
            r => r.GetPublicBySlugAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetPublicAsync_WhenOwnerEntitlementExpired_ThenReturnsNull()
    {
        var existing = SampleDocument("usr_owner", "published");
        existing.Visibility = "public";
        existing.Slug = "morning";
        existing.LinkedPlatformAccountId = "platform_1";
        existing.Video.CreatorUsername = "coach";
        _accounts
            .Setup(r => r.GetVerifiedByCurrentUsernameAsync("tiktok", "coach", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TikTokAccount(verified: true));
        _repository
            .Setup(r => r.GetPublicByAccountSlugAsync(
                "usr_owner",
                "platform_1",
                "morning",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _entitlement
            .Setup(e => e.HasPublicEntitlementAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.GetPublicAsync("t", "coach", "morning");

        result.Should().BeNull();
    }

    [Fact]
    public async Task ListPublicByUsernameAsync_WhenOwnerEntitlementExpired_ThenReturnsEmpty()
    {
        var existing = SampleDocument("usr_owner", "published");
        existing.Visibility = "public";
        existing.Slug = "morning";
        existing.Video.CreatorUsername = "coach";
        _repository
            .Setup(r => r.ListPublicByUsernameAsync("tiktok", "coach", It.IsAny<CancellationToken>()))
            .ReturnsAsync([existing]);
        _entitlement
            .Setup(e => e.HasPublicEntitlementAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.ListPublicByUsernameAsync("t", "coach");

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ListRelatedPublicAsync_WhenOwnerEntitlementExpired_ThenReturnsEmpty()
    {
        var existing = SampleDocument("usr_owner", "published");
        existing.Visibility = "public";
        existing.Slug = "morning";
        existing.LinkedPlatformAccountId = "platform_1";
        existing.Video.CreatorUsername = "coach";
        _accounts
            .Setup(r => r.GetVerifiedByCurrentUsernameAsync("tiktok", "coach", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TikTokAccount(verified: true));
        _repository
            .Setup(r => r.GetPublicByAccountSlugAsync(
                "usr_owner",
                "platform_1",
                "morning",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _entitlement
            .Setup(e => e.HasPublicEntitlementAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.ListRelatedPublicAsync("t", "coach", "morning");

        result.Should().BeEmpty();
        _repository.Verify(
            r => r.ListPublicByLinkedAccountAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PublishMineAsync_WhenUnverified_ThenThrows()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "coach";
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([TikTokAccount(verified: false)]);

        var act = () => _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "morning" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*verified TikTok*");
        _entitlement.Verify(
            e => e.StartTrialIfNeededAsync(
                It.IsAny<string>(),
                It.IsAny<DateTime>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PublishMineAsync_WhenVideoNotOwned_ThenThrows()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "coach";
        var account = TikTokAccount(verified: true);
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([account]);
        _ownership
            .Setup(o => o.OwnsVideoAsync(It.IsAny<LinkedPlatformAccountDocument>(), "123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var act = () => _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "morning" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not owned*");
    }

    [Fact]
    public async Task PublishMineAsync_WhenSlugTaken_ThenThrowsConflict()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "coach";
        var account = TikTokAccount(verified: true);
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([account]);
        _ownership
            .Setup(o => o.OwnsVideoAsync(It.IsAny<LinkedPlatformAccountDocument>(), "123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _repository
            .Setup(r => r.SlugTakenAsync("usr_owner", account.Id, "morning", existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var act = () => _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "Morning" });

        await act.Should().ThrowAsync<SlugConflictException>();
    }

    [Fact]
    public async Task PublishMineAsync_WhenOwned_ThenMakesPublicAndCreatesCreator()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "coach";
        var account = TikTokAccount(verified: true);
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([account]);
        _ownership
            .Setup(o => o.OwnsVideoAsync(It.IsAny<LinkedPlatformAccountDocument>(), "123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _repository
            .Setup(r => r.SlugTakenAsync("usr_owner", account.Id, "morning", existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _repository
            .Setup(r => r.UpdateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) => doc);

        var result = await _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "Morning" });

        result.Visibility.Should().Be("public");
        result.Slug.Should().Be("morning");
        result.LinkedPlatformAccountId.Should().Be(account.Id);
        result.Video.CreatorUsername.Should().Be("coach");
        result.PublicPath.Should().Be("/t/coach/morning");
        _creators.Verify(
            c => c.EnsureForUserAsync(
                "usr_owner",
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _entitlement.Verify(
            e => e.StartTrialIfNeededAsync(
                "usr_owner",
                It.IsAny<DateTime>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task PublishMineAsync_WhenEntitlementExpired_ThenThrows()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "coach";
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _entitlement
            .Setup(e => e.CanPublishPublicAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var act = () => _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "morning" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*trial has ended*");
        _repository.Verify(
            r => r.UpdateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _entitlement.Verify(
            e => e.StartTrialIfNeededAsync(
                It.IsAny<string>(),
                It.IsAny<DateTime>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UnpublishMineAsync_WhenEntitlementExpired_ThenStillUnpublishes()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Visibility = "public";
        existing.Slug = "morning";
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _repository
            .Setup(r => r.UpdateAsync(It.IsAny<StepsItemDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StepsItemDocument doc, CancellationToken _) => doc);
        _entitlement
            .Setup(e => e.CanPublishPublicAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.UnpublishMineAsync(existing.Id);

        result.Visibility.Should().Be("private");
        _repository.Verify(
            r => r.UpdateAsync(
                It.Is<StepsItemDocument>(d => d.Visibility == "private"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task PublishMineAsync_WhenVideoFromDifferentTikTok_ThenThrows()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        existing.Video.CreatorUsername = "someone-else";
        var account = TikTokAccount(verified: true);
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([account]);

        var act = () => _sut.PublishMineAsync(existing.Id, new PublishStepsItemRequest { Slug = "morning" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not from a linked account*");
        _ownership.Verify(
            o => o.OwnsVideoAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _entitlement.Verify(
            e => e.StartTrialIfNeededAsync(
                It.IsAny<string>(),
                It.IsAny<DateTime>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PublishMineAsync_WhenOtherUsersAccountId_ThenThrows()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner", "published");
        _repository
            .Setup(r => r.GetByIdAsync(existing.Id, "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _accounts
            .Setup(r => r.GetByIdAsync("platform_other", "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument?)null);

        var act = () => _sut.PublishMineAsync(
            existing.Id,
            new PublishStepsItemRequest { Slug = "morning", LinkedPlatformAccountId = "platform_other" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    private static LinkedPlatformAccountDocument TikTokAccount(bool verified) =>
        new()
        {
            Id = "platform_1",
            UserId = "usr_owner",
            Provider = "tiktok",
            ExternalAccountId = "oid",
            Username = "coach",
            DisplayName = "Coach",
            IsVerified = verified,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

    private void Authenticate(string userId)
    {
        _currentUser.IsAuthenticated = true;
        _currentUser.UserId = userId;
    }

    private static CreateStepsItemRequest ValidCreateRequest() =>
        new()
        {
            Title = "Demo workout",
            Description = "A short demo",
            CreatorDisplayName = "Tester",
            ContinuousSoundtrack = false,
            Video = new VideoReferenceRequest
            {
                Provider = "tiktok",
                ExternalVideoId = "123",
                SourceUrl = "https://www.tiktok.com/@x/video/123",
                CreatorUsername = "x",
                DurationSeconds = 60,
            },
            Steps =
            [
                new StepDefinitionRequest
                {
                    Order = 1,
                    Title = "Warm up",
                    StartSeconds = 0,
                    EndSeconds = 10,
                    DurationSeconds = 10,
                    AutoAdvance = true,
                },
            ],
        };

    private static UpdateStepsItemRequest ValidUpdateRequest() =>
        new()
        {
            Title = "Updated",
            Video = new VideoReferenceRequest
            {
                Provider = "tiktok",
                ExternalVideoId = "123",
                SourceUrl = "https://www.tiktok.com/@x/video/123",
                DurationSeconds = 60,
            },
            Steps =
            [
                new StepDefinitionRequest
                {
                    Order = 1,
                    Title = "Warm up",
                    StartSeconds = 0,
                    EndSeconds = 10,
                },
            ],
        };

    private static StepsItemDocument SampleDocument(string userId, string status) =>
        new()
        {
            Id = "steps_1",
            CreatedByUserId = userId,
            Visibility = "private",
            Status = status,
            Title = "Existing",
            ContinuousSoundtrack = false,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
            Video = new VideoReferenceDocument
            {
                Provider = "tiktok",
                ExternalVideoId = "123",
                SourceUrl = "https://www.tiktok.com/@x/video/123",
            },
            Steps =
            [
                new StepDefinitionDocument
                {
                    Id = "step_1",
                    Order = 1,
                    Title = "Warm up",
                    StartSeconds = 0,
                    EndSeconds = 10,
                },
            ],
        };
}
