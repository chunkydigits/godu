using FluentAssertions;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Service.Identity;
using Godu.Service.PlatformAccounts;
using Godu.Service.TikTok;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Godu.Service.Tests.PlatformAccounts;

public sealed class LinkedPlatformAccountServiceTests
{
    private readonly Mock<ILinkedPlatformAccountRepository> _repository = new();
    private readonly CurrentUser _currentUser = new();
    private readonly Mock<ITikTokOAuthClient> _tikTok = new();
    private readonly InMemoryPlatformOAuthStateStore _stateStore = new();
    private readonly PassThroughProtector _protector = new();
    private readonly LinkedPlatformAccountService _sut;

    public LinkedPlatformAccountServiceTests()
    {
        var options = Options.Create(new TikTokOptions
        {
            ClientKey = "client-key",
            ClientSecret = "client-secret",
            RedirectUri = "https://localhost:7166/api/me/platform-accounts/tiktok/callback",
            FrontendReturnUrl = "http://localhost:4200/settings",
            Scopes = "user.info.basic,user.info.profile,video.list",
        });

        _sut = new LinkedPlatformAccountService(
            _repository.Object,
            _currentUser,
            _tikTok.Object,
            _stateStore,
            _protector,
            TokenResolver(),
            options,
            NullLogger<LinkedPlatformAccountService>.Instance);
    }

    [Fact]
    public async Task StartConnectAsync_WhenNotAuthenticated_ThenThrowsUnauthorized()
    {
        var act = async () => await _sut.StartConnectAsync("tiktok");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task StartConnectAsync_WhenUnknownProvider_ThenThrows()
    {
        Authenticate("usr_owner");

        var act = async () => await _sut.StartConnectAsync("youtube");

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*TikTok*");
    }

    [Fact]
    public async Task StartConnectAsync_WhenTikTokNotConfigured_ThenThrows()
    {
        Authenticate("usr_owner");
        var sut = CreateUnconfiguredService();

        var act = async () => await sut.StartConnectAsync("tiktok");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not configured*");
    }

    [Fact]
    public async Task StartConnectAsync_WhenAuthenticated_ThenReturnsAuthorizeUrlWithState()
    {
        Authenticate("usr_owner");

        var result = await _sut.StartConnectAsync("t");

        result.Provider.Should().Be("tiktok");
        result.AuthorizationUrl.Should().Contain("https://www.tiktok.com/v2/auth/authorize/");
        result.AuthorizationUrl.Should().Contain("client_key=client-key");
        result.AuthorizationUrl.Should().Contain("response_type=code");
        result.AuthorizationUrl.Should().Contain("user.info.basic");
        result.AuthorizationUrl.Should().Contain(Uri.EscapeDataString(
            "https://localhost:7166/api/me/platform-accounts/tiktok/callback"));
        result.AuthorizationUrl.Should().Contain("state=");
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenStateUnknown_ThenReturnsInvalid()
    {
        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", "code", "missing-state", null);

        url.Should().Be("http://localhost:4200/settings?error=invalid");
        _tikTok.Verify(
            c => c.ExchangeCodeAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenTikTokDenied_ThenReturnsDenied()
    {
        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", null, null, "access_denied");

        url.Should().Be("http://localhost:4200/settings?error=denied");
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenTikTokSucceeds_ThenCreatesVerifiedAccountWithoutExposingTokens()
    {
        Authenticate("usr_owner");
        var started = await _sut.StartConnectAsync("tiktok");
        var state = ExtractState(started.AuthorizationUrl);

        _tikTok
            .Setup(c => c.ExchangeCodeAsync("auth-code", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidTokens());
        _tikTok
            .Setup(c => c.GetUserInfoAsync("access-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidProfile());

        LinkedPlatformAccountDocument? saved = null;
        _repository
            .Setup(r => r.GetByProviderAndExternalIdAsync("tiktok", "open-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument?)null);
        _repository
            .Setup(r => r.CreateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument doc, CancellationToken _) =>
            {
                saved = doc;
                return doc;
            });

        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", "auth-code", state, null);

        url.Should().Be("http://localhost:4200/settings?linked=tiktok");
        saved.Should().NotBeNull();
        saved!.UserId.Should().Be("usr_owner");
        saved.Provider.Should().Be("tiktok");
        saved.ExternalAccountId.Should().Be("open-1");
        saved.Username.Should().Be("therealjoe");
        saved.AvatarUrl.Should().Be("https://example.com/a.png");
        saved.Bio.Should().Be("I coach people.");
        saved.IsVerified.Should().BeTrue();
        saved.VerifiedUtc.Should().NotBeNull();
        saved.EncryptedAccessToken.Should().Be("p:access-token");
        saved.EncryptedRefreshToken.Should().Be("p:refresh-token");
        LinkedPlatformAccountMapperTokensAreHidden(saved);
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenAccountLinkedToOtherUser_ThenReturnsConflict()
    {
        Authenticate("usr_owner");
        var started = await _sut.StartConnectAsync("tiktok");
        var state = ExtractState(started.AuthorizationUrl);

        _tikTok
            .Setup(c => c.ExchangeCodeAsync("auth-code", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidTokens());
        _tikTok
            .Setup(c => c.GetUserInfoAsync("access-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidProfile());
        _repository
            .Setup(r => r.GetByProviderAndExternalIdAsync("tiktok", "open-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDocument("usr_other"));

        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", "auth-code", state, null);

        url.Should().Be("http://localhost:4200/settings?error=conflict");
        _repository.Verify(
            r => r.CreateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenSameUserReconnects_ThenUpdatesExisting()
    {
        Authenticate("usr_owner");
        var started = await _sut.StartConnectAsync("tiktok");
        var state = ExtractState(started.AuthorizationUrl);
        var existing = SampleDocument("usr_owner");
        existing.Username = "oldname";

        _tikTok
            .Setup(c => c.ExchangeCodeAsync("auth-code", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidTokens());
        _tikTok
            .Setup(c => c.GetUserInfoAsync("access-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidProfile());
        _repository
            .Setup(r => r.GetByProviderAndExternalIdAsync("tiktok", "open-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _repository
            .Setup(r => r.UpdateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument doc, CancellationToken _) => doc);

        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", "auth-code", state, null);

        url.Should().Be("http://localhost:4200/settings?linked=tiktok");
        _repository.Verify(
            r => r.UpdateAsync(
                It.Is<LinkedPlatformAccountDocument>(d =>
                    d.Id == existing.Id
                    && d.Username == "therealjoe"
                    && d.UsernameAliases.Contains("oldname")
                    && d.IsVerified
                    && d.EncryptedAccessToken == "p:access-token"),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _repository.Verify(
            r => r.CreateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CompleteConnectFromCallbackAsync_WhenUserInfoFails_ThenDoesNotCreateAccount()
    {
        Authenticate("usr_owner");
        var started = await _sut.StartConnectAsync("tiktok");
        var state = ExtractState(started.AuthorizationUrl);

        _tikTok
            .Setup(c => c.ExchangeCodeAsync("auth-code", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidTokens());
        _tikTok
            .Setup(c => c.GetUserInfoAsync("access-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("TikTok user info failed (denied)."));

        var url = await _sut.CompleteConnectFromCallbackAsync("tiktok", "auth-code", state, null);

        url.Should().Be("http://localhost:4200/settings?error=failed");
        _repository.Verify(
            r => r.CreateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ListMineAsync_WhenAuthenticated_ThenReturnsAccountsWithoutTokens()
    {
        Authenticate("usr_owner");
        _repository
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([SampleDocument("usr_owner")]);

        var result = await _sut.ListMineAsync();

        result.Should().ContainSingle();
        result[0].Id.Should().Be("platform_1");
        result[0].Username.Should().Be("therealjoe");
        result[0].IsVerified.Should().BeTrue();
        result[0].GetType().GetProperty("EncryptedAccessToken").Should().BeNull();
    }

    [Fact]
    public async Task DisconnectAsync_WhenOwner_ThenDeletesAndRevokes()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner");
        existing.EncryptedAccessToken = "p:access-token";
        _repository
            .Setup(r => r.GetByIdAsync("platform_1", "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        await _sut.DisconnectAsync("platform_1");

        _tikTok.Verify(c => c.RevokeAsync("access-token", It.IsAny<CancellationToken>()), Times.Once);
        _repository.Verify(r => r.DeleteAsync("platform_1", "usr_owner", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DisconnectAsync_WhenRevokeFails_ThenStillDeletes()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner");
        existing.EncryptedAccessToken = "p:access-token";
        _repository
            .Setup(r => r.GetByIdAsync("platform_1", "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _tikTok
            .Setup(c => c.RevokeAsync("access-token", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("revoke failed"));

        await _sut.DisconnectAsync("platform_1");

        _repository.Verify(r => r.DeleteAsync("platform_1", "usr_owner", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshVerifiedMetadataAsync_WhenTikTokReturnsNewProfile_ThenPersistsLiveFields()
    {
        Authenticate("usr_owner");
        var existing = SampleDocument("usr_owner");
        existing.EncryptedAccessToken = "p:access-token";
        existing.AccessTokenExpiresUtc = DateTime.UtcNow.AddHours(1);
        existing.AvatarUrl = "https://example.com/old.png";
        existing.Bio = "Old bio";
        _repository
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([existing]);
        _tikTok
            .Setup(c => c.GetUserInfoAsync("access-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokUserInfo
            {
                OpenId = "open-1",
                Username = "therealjoe",
                DisplayName = "Joe v2",
                AvatarUrl = "https://example.com/new.png",
                Bio = "Updated TikTok bio",
            });
        LinkedPlatformAccountDocument? saved = null;
        _repository
            .Setup(r => r.UpdateAsync(It.IsAny<LinkedPlatformAccountDocument>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument doc, CancellationToken _) =>
            {
                saved = doc;
                return doc;
            });

        var result = await _sut.RefreshVerifiedMetadataAsync();

        result.DisplayName.Should().Be("Joe v2");
        result.AvatarUrl.Should().Be("https://example.com/new.png");
        result.Bio.Should().Be("Updated TikTok bio");
        saved.Should().NotBeNull();
        saved!.AvatarUrl.Should().Be("https://example.com/new.png");
        saved.Bio.Should().Be("Updated TikTok bio");
    }

    [Fact]
    public async Task RefreshVerifiedMetadataAsync_WhenNoVerifiedAccount_ThenThrows()
    {
        Authenticate("usr_owner");
        _repository
            .Setup(r => r.ListByUserAsync("usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var act = () => _sut.RefreshVerifiedMetadataAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DisconnectAsync_WhenNotOwner_ThenThrowsNotFound()
    {
        Authenticate("usr_owner");
        _repository
            .Setup(r => r.GetByIdAsync("platform_1", "usr_owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync((LinkedPlatformAccountDocument?)null);

        var act = async () => await _sut.DisconnectAsync("platform_1");

        await act.Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(
            r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private void Authenticate(string userId)
    {
        _currentUser.IsAuthenticated = true;
        _currentUser.UserId = userId;
    }

    private LinkedPlatformAccountService CreateUnconfiguredService()
    {
        return new LinkedPlatformAccountService(
            _repository.Object,
            _currentUser,
            _tikTok.Object,
            _stateStore,
            _protector,
            TokenResolver(),
            Options.Create(new TikTokOptions()),
            NullLogger<LinkedPlatformAccountService>.Instance);
    }

    private TikTokAccessTokenResolver TokenResolver() =>
        new(
            _tikTok.Object,
            _protector,
            _repository.Object,
            NullLogger<TikTokAccessTokenResolver>.Instance);

    private static TikTokTokenResult ValidTokens() => new()
    {
        AccessToken = "access-token",
        RefreshToken = "refresh-token",
        OpenId = "open-1",
        ExpiresInSeconds = 3600,
        RefreshExpiresInSeconds = 86400,
        Scope = "user.info.basic",
    };

    private static TikTokUserInfo ValidProfile() => new()
    {
        OpenId = "open-1",
        Username = "TheRealJoe",
        DisplayName = "Joe Fitness",
        AvatarUrl = "https://example.com/a.png",
        Bio = "I coach people.",
    };

    private static LinkedPlatformAccountDocument SampleDocument(string userId) => new()
    {
        Id = "platform_1",
        UserId = userId,
        Provider = "tiktok",
        ExternalAccountId = "open-1",
        Username = "therealjoe",
        DisplayName = "Joe Fitness",
        IsVerified = true,
        VerifiedUtc = DateTime.UtcNow,
        CreatedUtc = DateTime.UtcNow,
        UpdatedUtc = DateTime.UtcNow,
        EncryptedAccessToken = "p:old-token",
    };

    private static string ExtractState(string authorizationUrl)
    {
        var uri = new Uri(authorizationUrl);
        var query = uri.Query.TrimStart('?').Split('&');
        var state = query
            .Select(part => part.Split('=', 2))
            .First(part => part[0] == "state")[1];
        return Uri.UnescapeDataString(state);
    }

    private static void LinkedPlatformAccountMapperTokensAreHidden(LinkedPlatformAccountDocument saved)
    {
        var response = Godu.Service.Mapping.LinkedPlatformAccountMapper.ToResponse(saved);
        response.Username.Should().Be(saved.Username);
        typeof(Godu.Model.Responses.LinkedPlatformAccountResponse)
            .GetProperties()
            .Select(p => p.Name)
            .Should()
            .NotContain(name => name.Contains("Token", StringComparison.OrdinalIgnoreCase));
    }

    private sealed class PassThroughProtector : IPlatformTokenProtector
    {
        public string Protect(string plaintext) => $"p:{plaintext}";

        public string Unprotect(string protectedValue) =>
            protectedValue.StartsWith("p:", StringComparison.Ordinal)
                ? protectedValue[2..]
                : protectedValue;
    }
}
