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
        created.ProfileImageUrl.Should().Be("https://img");
        created.Id.Should().StartWith("creator_");
        repo.Verify(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateForUserAsync_WhenMissing_ThenCreatesAndStoresBio()
    {
        var repo = new Mock<ICreatorRepository>();
        repo.Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument?)null);
        repo.Setup(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument doc, CancellationToken _) => doc);
        repo.Setup(r => r.UpdateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument doc, CancellationToken _) => doc);

        var sut = new CreatorService(repo.Object);
        var updated = await sut.UpdateForUserAsync(
            "usr_1",
            "Ada",
            "Hello",
            "https://cdn.example/me.png");

        updated.Bio.Should().Be("Hello");
        updated.ProfileImageUrl.Should().Be("https://cdn.example/me.png");
        repo.Verify(r => r.UpdateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateForUserAsync_WhenImageIsNotHttp_ThenThrows()
    {
        var sut = new CreatorService(new Mock<ICreatorRepository>().Object);

        var act = () => sut.UpdateForUserAsync("usr_1", "Ada", null, "ftp://cdn.example/me.png");

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateForUserAsync_WhenDataImagePng_ThenStores()
    {
        var repo = new Mock<ICreatorRepository>();
        repo.Setup(r => r.GetByUserIdAsync("usr_1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument?)null);
        repo.Setup(r => r.CreateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument doc, CancellationToken _) => doc);
        repo.Setup(r => r.UpdateAsync(It.IsAny<CreatorDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreatorDocument doc, CancellationToken _) => doc);

        const string dataUrl =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        var sut = new CreatorService(repo.Object);
        var updated = await sut.UpdateForUserAsync("usr_1", "Ada", null, dataUrl);

        updated.ProfileImageUrl.Should().Be(dataUrl);
    }

    [Fact]
    public async Task UpdateForUserAsync_WhenDataHtml_ThenThrows()
    {
        var sut = new CreatorService(new Mock<ICreatorRepository>().Object);

        var act = () => sut.UpdateForUserAsync(
            "usr_1",
            "Ada",
            null,
            "data:text/html;base64,PGh0bWw+PC9odG1sPg==");

        await act.Should().ThrowAsync<ArgumentException>();
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
