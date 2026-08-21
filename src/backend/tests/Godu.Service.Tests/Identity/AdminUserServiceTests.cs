using FluentAssertions;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Microsoft.Extensions.Options;

namespace Godu.Service.Tests.Identity;

public sealed class AdminUserServiceTests
{
    private readonly InMemoryUserRepository _users = new();
    private readonly AnalyticsOptions _options = new() { AllowAnyAuthenticatedAdmin = false };
    private readonly CurrentUser _currentUser = new() { IsAuthenticated = true, UserId = "usr_admin" };
    private readonly AdminUserService _sut;

    public AdminUserServiceTests()
    {
        var adminAccess = new AdminAccessService(_currentUser, _users, Options.Create(_options));
        _sut = new AdminUserService(_users, adminAccess);
    }

    [Fact]
    public async Task ListAsync_WhenNotAdmin_ThenThrows()
    {
        _currentUser.IsAuthenticated = false;

        var act = () => _sut.ListAsync();

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateAsync_WhenGrantingAdmin_ThenPersistsFlag()
    {
        await Seed("usr_admin", isAdmin: true);
        await Seed("usr_ada", isAdmin: false);

        var updated = await _sut.UpdateAsync("usr_ada", new UpdateAdminUserRequest { IsAdmin = true });

        updated.IsAdmin.Should().BeTrue();
        (await _users.GetByIdAsync("usr_ada"))!.IsAdmin.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_WhenDemotingLastAdmin_ThenThrows()
    {
        await Seed("usr_admin", isAdmin: true);

        var act = () => _sut.UpdateAsync("usr_admin", new UpdateAdminUserRequest { IsAdmin = false });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpdateAsync_WhenMarkingInternal_ThenPersistsFlag()
    {
        await Seed("usr_admin", isAdmin: true);
        await Seed("usr_ada", isAdmin: false);

        var updated = await _sut.UpdateAsync("usr_ada", new UpdateAdminUserRequest { IsInternal = true });

        updated.IsInternal.Should().BeTrue();
    }

    private async Task Seed(string id, bool isAdmin)
    {
        await _users.CreateAsync(new UserDocument
        {
            Id = id,
            DisplayName = id,
            IsAdmin = isAdmin,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        });
    }
}
