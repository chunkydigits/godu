using FluentAssertions;
using Godu.Model.Documents;
using Godu.Repository.Creators;
using Godu.Service.Creators;
using Moq;

namespace Godu.Service.Tests.Creators;

public sealed class CreatorServiceTests
{
    [Fact]
    public async Task EnsureForUserAsync_WhenMissing_ThenCreatesOnce()
    {
        var repo = new Mock<ICreatorRepository>();
        repo.Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument?)null);
        repo.Setup(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument doc, CancellationToken _) => doc);

        var sut = new CreatorService(repo.Object);
        var created = await sut.EnsureForUserAsync("usr_1", "Ada", "https://img");

        created.UserId.Should().Be("usr_1");
        created.DisplayName.Should().Be("Ada");
        created.Id.Should().StartWith("creator_");
        repo.Verify(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EnsureForUserAsync_WhenExists_ThenDoesNotCreate()
    {
        var existing = new CreatorDocument
        {
            Id = "creator_1",
            UserId = "usr_1",
            DisplayName = "Ada",
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };
        var repo = new Mock<ICreatorRepository>();
        repo.Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var sut = new CreatorService(repo.Object);
        var result = await sut.EnsureForUserAsync("usr_1", "Other", null);

        result.Id.Should().Be("creator_1");
        repo.Verify(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
