using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.Creators;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Godu.Service.PlatformAccounts;
using Godu.Utility;

namespace Godu.Service.Creators;

public sealed class CreatorProfileService : ICreatorProfileService
{
    private readonly IUserRepository _users;
    private readonly ILinkedPlatformAccountRepository _accounts;
    private readonly ICreatorRepository _creators;
    private readonly IStepsItemRepository _steps;
    private readonly ICreatorService _creatorService;
    private readonly ILinkedPlatformAccountService _platformAccounts;
    private readonly ICurrentUser _currentUser;

    public CreatorProfileService(
        IUserRepository users,
        ILinkedPlatformAccountRepository accounts,
        ICreatorRepository creators,
        IStepsItemRepository steps,
        ICreatorService creatorService,
        ILinkedPlatformAccountService platformAccounts,
        ICurrentUser currentUser)
    {
        _users = users;
        _accounts = accounts;
        _creators = creators;
        _steps = steps;
        _creatorService = creatorService;
        _platformAccounts = platformAccounts;
        _currentUser = currentUser;
    }

    public async Task<CreatorProfileResponse> GetPublicAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        return await BuildProfileAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<CreatorProfileResponse> GetPublicByHandleAsync(
        string providerAlias,
        string username,
        CancellationToken cancellationToken = default)
    {
        if (!ProviderUtilities.TryCanonicalise(providerAlias, out var provider))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var handle = username.Trim().TrimStart('@');
        var account = await _accounts
            .GetVerifiedByProviderAndUsernameAsync(provider, handle, cancellationToken)
            .ConfigureAwait(false);
        if (account is null)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        return await BuildProfileAsync(account.UserId, cancellationToken).ConfigureAwait(false);
    }

    public Task<CreatorProfileResponse> GetMineAsync(CancellationToken cancellationToken = default) =>
        BuildProfileAsync(RequireUserId(), cancellationToken);

    public async Task<CreatorProfileResponse> UpdateMineAsync(
        UpdateCreatorProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var current = await BuildProfileAsync(userId, cancellationToken).ConfigureAwait(false);
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? current.DisplayName
            : request.DisplayName.Trim();

        await _creatorService
            .UpdateForUserAsync(
                userId,
                displayName,
                request.Bio,
                request.ProfileImageUrl,
                cancellationToken)
            .ConfigureAwait(false);

        return await BuildProfileAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<CreatorProfileResponse> ImportMineFromSocialAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var source = await _platformAccounts
            .RefreshVerifiedMetadataAsync(cancellationToken)
            .ConfigureAwait(false);

        var displayName = FirstNonEmpty(source.DisplayName, $"@{source.Username}") ?? "Creator";
        await _creatorService
            .UpdateForUserAsync(
                userId,
                displayName,
                source.Bio,
                source.AvatarUrl,
                cancellationToken)
            .ConfigureAwait(false);

        return await BuildProfileAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    private async Task<CreatorProfileResponse> BuildProfileAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var creator = await _creators.GetByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var accounts = await _accounts.ListByUserAsync(userId, cancellationToken).ConfigureAwait(false);
        var socials = CreatorSocialMapper.Combine(accounts);
        if (socials.Count == 0)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var displayName = FirstNonEmpty(
            creator?.DisplayName,
            user?.DisplayName,
            $"@{socials[0].Username}");

        var image = FirstNonEmpty(
            [creator?.ProfileImageUrl, ..accounts.Select(account => account.AvatarUrl)]);
        var bio = FirstNonEmpty(
            [creator?.Bio, ..accounts.Select(account => account.Bio)]);

        var published = await _steps
            .ListPublicByUserAsync(userId, cancellationToken)
            .ConfigureAwait(false);

        return new CreatorProfileResponse
        {
            UserId = userId,
            DisplayName = displayName!,
            Bio = bio,
            ProfileImageUrl = image,
            Socials = socials,
            PublishedSteps = published.Select(StepsItemMapper.ToPublicSummary).ToList(),
        };
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();
}
