using FluentAssertions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Service.Identity;
using Godu.Service.StepsItems;
using Moq;

namespace Godu.Service.Tests.StepsItems;

public sealed class StepsItemServiceTests
{
    private readonly Mock<IStepsItemRepository> _repository = new();
    private readonly Mock<ILinkedPlatformAccountRepository> _accounts = new();
    private readonly CurrentUser _currentUser = new();
    private readonly StepsItemService _sut;

    public StepsItemServiceTests()
    {
        _accounts
            .Setup(r => r.ListByUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sut = new StepsItemService(_repository.Object, _accounts.Object, _currentUser);
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

        var result = await _sut.CreateMineAsync(request);

        saved.Should().NotBeNull();
        saved!.GapSeconds.Should().Be(60);
        saved.GapMessage.Should().Be("Active recovery");
        result.GapSeconds.Should().Be(60);
        result.GapMessage.Should().Be("Active recovery");
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
