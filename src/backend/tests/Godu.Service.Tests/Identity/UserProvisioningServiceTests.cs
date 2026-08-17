using FluentAssertions;
using Godu.Model.Documents;
using Godu.Repository.ExternalIdentities;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Moq;

namespace Godu.Service.Tests.Identity;

public sealed class UserProvisioningServiceTests
{
    private readonly Mock<IExternalIdentityRepository> _identities = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly UserProvisioningService _sut;

    public UserProvisioningServiceTests()
    {
        _sut = new UserProvisioningService(_identities.Object, _users.Object);
    }

    [Fact]
    public async Task EnsureUserAsync_WhenIdentityExists_ThenReturnsExistingUserId()
    {
        _identities
            .Setup(r => r.GetByProviderSubjectAsync("auth0", "sub-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExternalIdentityDocument
            {
                Id = "ext_1",
                UserId = "usr_existing",
                IdentityProvider = "auth0",
                ExternalSubjectId = "sub-1",
                CreatedUtc = DateTime.UtcNow,
            });

        var userId = await _sut.EnsureUserAsync("auth0", "sub-1", "Ada");

        userId.Should().Be("usr_existing");
        _users.Verify(r => r.CreateAsync(It.IsAny<UserDocument>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EnsureUserAsync_WhenFirstLogin_ThenCreatesUserAndExternalIdentity()
    {
        _identities
            .Setup(r => r.GetByProviderSubjectAsync("auth0", "sub-new", It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExternalIdentityDocument?)null);
        _users
            .Setup(r => r.CreateAsync(It.IsAny<UserDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserDocument u, CancellationToken _) => u);
        _identities
            .Setup(r => r.CreateAsync(It.IsAny<ExternalIdentityDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExternalIdentityDocument e, CancellationToken _) => e);

        var userId = await _sut.EnsureUserAsync("auth0", "sub-new", "Ada Lovelace");

        userId.Should().StartWith("usr_");
        _users.Verify(
            r => r.CreateAsync(
                It.Is<UserDocument>(u => u.Id == userId && u.DisplayName == "Ada Lovelace"),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _identities.Verify(
            r => r.CreateAsync(
                It.Is<ExternalIdentityDocument>(e =>
                    e.UserId == userId
                    && e.IdentityProvider == "auth0"
                    && e.ExternalSubjectId == "sub-new"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
