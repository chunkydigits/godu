using FluentAssertions;
using Godu.Model.Documents;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.StepsItems;
using Godu.Service.TikTok;
using Moq;

namespace Godu.Service.Tests.StepsItems;

public sealed class PublicHandleResolutionTests
{
    private readonly InMemoryLinkedPlatformAccountRepository _accounts = new();
    private readonly InMemoryStepsItemRepository _steps = new();
    private readonly StepsItemService _sut;

    public PublicHandleResolutionTests()
    {
        _sut = new StepsItemService(
            _steps,
            _accounts,
            new CurrentUser(),
            Mock.Of<ITikTokVideoOwnershipVerifier>(),
            Mock.Of<ICreatorService>(),
            Mock.Of<IUserRepository>());
    }

    [Fact]
    public async Task GetPublicAsync_WhenCurrentOwnerPublishedSlug_ThenCurrentOwnerWins()
    {
        await SeedAccountAsync(Account("usr_a", "pa_a", "newname", ["oldname"]));
        await SeedAccountAsync(Account("usr_b", "pa_b", "oldname"));
        await SeedGoduAsync(Godu("usr_a", "pa_a", "newname", "stretch"));
        await SeedGoduAsync(Godu("usr_b", "pa_b", "oldname", "stretch"));

        var item = await _sut.GetPublicAsync("t", "oldname", "stretch");

        item.Should().NotBeNull();
        item!.CreatedByUserId.Should().Be("usr_b");
        item.PublicPath.Should().Be("/t/oldname/stretch");
    }

    [Fact]
    public async Task GetPublicAsync_WhenCurrentOwnerHasNoSlug_ThenRedirectsToPreviousOwnerCanonical()
    {
        await SeedAccountAsync(Account("usr_a", "pa_a", "newname", ["oldname"]));
        await SeedAccountAsync(Account("usr_b", "pa_b", "oldname"));
        await SeedGoduAsync(Godu("usr_a", "pa_a", "newname", "stretch"));

        var item = await _sut.GetPublicAsync("t", "oldname", "stretch");

        item.Should().NotBeNull();
        item!.CreatedByUserId.Should().Be("usr_a");
        item.PublicPath.Should().Be("/t/newname/stretch");
    }

    [Fact]
    public async Task GetPublicAsync_WhenHandleIsOnlyAnAlias_ThenReturnsPreviousOwnerCanonical()
    {
        await SeedAccountAsync(Account("usr_a", "pa_a", "newname", ["oldname"]));
        await SeedGoduAsync(Godu("usr_a", "pa_a", "newname", "stretch"));

        var item = await _sut.GetPublicAsync("t", "oldname", "stretch");

        item.Should().NotBeNull();
        item!.PublicPath.Should().Be("/t/newname/stretch");
    }

    [Fact]
    public async Task RewriteCreatorHandleAsync_ThenOldHandleResolvesToNewCanonical()
    {
        var account = Account("usr_a", "pa_a", "oldname");
        await SeedAccountAsync(account);
        await SeedGoduAsync(Godu("usr_a", "pa_a", "oldname", "stretch"));

        account.UsernameAliases.Add("oldname");
        account.Username = "newname";
        await _accounts.UpdateAsync(account);
        (await _steps.RewriteCreatorHandleAsync("usr_a", "pa_a", "oldname", "newname")).Should().Be(1);

        (await _sut.GetPublicAsync("t", "newname", "stretch"))!.PublicPath.Should().Be("/t/newname/stretch");
        (await _sut.GetPublicAsync("t", "oldname", "stretch"))!.PublicPath.Should().Be("/t/newname/stretch");
    }

    private async Task SeedAccountAsync(LinkedPlatformAccountDocument account) =>
        await _accounts.CreateAsync(account);

    private async Task SeedGoduAsync(StepsItemDocument item) =>
        await _steps.CreateAsync(item);

    private static LinkedPlatformAccountDocument Account(
        string userId,
        string id,
        string username,
        string[]? aliases = null) =>
        new()
        {
            Id = id,
            UserId = userId,
            Provider = "tiktok",
            ExternalAccountId = id,
            Username = username,
            UsernameAliases = [.. aliases ?? []],
            IsVerified = true,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

    private static StepsItemDocument Godu(
        string userId,
        string accountId,
        string username,
        string slug) =>
        new()
        {
            Id = $"steps_{accountId}_{slug}",
            CreatedByUserId = userId,
            LinkedPlatformAccountId = accountId,
            Visibility = "public",
            Status = "published",
            Slug = slug,
            Title = slug,
            ContinuousSoundtrack = false,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
            PublishedUtc = DateTime.UtcNow,
            Video = new VideoReferenceDocument
            {
                Provider = "tiktok",
                ExternalVideoId = "123",
                SourceUrl = $"https://www.tiktok.com/@{username}/video/123",
                CreatorUsername = username,
            },
            Steps = [],
        };
}
