using FluentAssertions;
using Godu.Model.Documents;
using Godu.Repository.StepsItems;

namespace Godu.Service.Tests.StepsItems;

public sealed class InMemoryStepsItemRepositoryTests
{
    [Fact]
    public async Task CreateAsync_ThenGetById_PreservesRepeatCount()
    {
        var repo = new InMemoryStepsItemRepository();
        var created = await repo.CreateAsync(Document(repeatCount: 4));

        created.RepeatCount.Should().Be(4);

        var loaded = await repo.GetByIdAsync(created.Id, created.CreatedByUserId);
        loaded.Should().NotBeNull();
        loaded!.RepeatCount.Should().Be(4);
        loaded.TimingBeepSeconds.Should().Be(20);
    }

    private static StepsItemDocument Document(int repeatCount) =>
        new()
        {
            Id = "steps_repeat",
            CreatedByUserId = "usr_owner",
            Visibility = "private",
            Status = "published",
            Title = "Circuit",
            RepeatCount = repeatCount,
            TimingBeepSeconds = 20,
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
                    Title = "Squats",
                    StartSeconds = 0,
                    EndSeconds = 5,
                    DurationSeconds = 30,
                    AutoAdvance = true,
                },
            ],
        };
}
