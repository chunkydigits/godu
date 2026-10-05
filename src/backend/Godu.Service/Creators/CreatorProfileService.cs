using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Model.Documents;
using Godu.Model.Configuration;
using Godu.Repository.Creators;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Godu.Service.PlatformAccounts;
using Godu.Utility;
using Microsoft.Extensions.Options;

namespace Godu.Service.Creators;

public sealed class CreatorProfileService : ICreatorProfileService
{
    private readonly IUserRepository _users;
    private readonly ILinkedPlatformAccountRepository _accounts;
    private readonly ICreatorRepository _creators;
    private readonly IStepsItemRepository _steps;
    private readonly ICreatorService _creatorService;
    private readonly ILinkedPlatformAccountService _platformAccounts;
    private readonly ICreatorEntitlementService _entitlement;
    private readonly ICurrentUser _currentUser;
    private readonly ProfileOptions _profileOptions;

    public CreatorProfileService(
        IUserRepository users,
        ILinkedPlatformAccountRepository accounts,
        ICreatorRepository creators,
        IStepsItemRepository steps,
        ICreatorService creatorService,
        ILinkedPlatformAccountService platformAccounts,
        ICreatorEntitlementService entitlement,
        ICurrentUser currentUser,
        IOptions<ProfileOptions> profileOptions)
    {
        _users = users;
        _accounts = accounts;
        _creators = creators;
        _steps = steps;
        _creatorService = creatorService;
        _platformAccounts = platformAccounts;
        _entitlement = entitlement;
        _currentUser = currentUser;
        _profileOptions = profileOptions.Value;
    }

    public async Task<CreatorProfileResponse> GetPublicAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        await EnsurePublicCatalogueAsync(userId, cancellationToken).ConfigureAwait(false);
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
        var current = await _accounts
            .GetVerifiedByCurrentUsernameAsync(provider, handle, cancellationToken)
            .ConfigureAwait(false);
        if (current is not null)
        {
            await EnsurePublicCatalogueAsync(current.UserId, cancellationToken).ConfigureAwait(false);
            return await BuildProfileAsync(current.UserId, cancellationToken).ConfigureAwait(false);
        }

        var previous = await _accounts
            .ListVerifiedByAliasAsync(provider, handle, cancellationToken)
            .ConfigureAwait(false);
        var alias = previous.FirstOrDefault();
        if (alias is null)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        await EnsurePublicCatalogueAsync(alias.UserId, cancellationToken).ConfigureAwait(false);
        return await BuildProfileAsync(alias.UserId, cancellationToken).ConfigureAwait(false);
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
            ExternalLinks = (creator?.ExternalLinks ?? [])
                .OrderBy(link => link.Order)
                .Select(link => new ProfileLinkResponse { Id = link.Id, Title = link.Title, Url = link.Url })
                .ToList(),
            PublishedSteps = published.Select(StepsItemMapper.ToPublicSummary).ToList(),
        };
    }

    public async Task<ProfileLinkResponse> AddLinkAsync(CreateProfileLinkRequest request, CancellationToken cancellationToken = default)
    {
        var creator = await GetOwnedCreatorAsync(cancellationToken).ConfigureAwait(false);
        var links = creator.ExternalLinks ??= [];
        if (links.Count >= Math.Max(0, _profileOptions.MaxExternalLinks))
        {
            throw new InvalidOperationException($"You can have at most {_profileOptions.MaxExternalLinks} external links.");
        }
        var link = CreateLink(request, links.Count);
        links.Add(link);
        await SaveCreatorAsync(creator, cancellationToken).ConfigureAwait(false);
        return ToLinkResponse(link);
    }

    public async Task<ProfileLinkResponse> UpdateLinkAsync(string linkId, CreateProfileLinkRequest request, CancellationToken cancellationToken = default)
    {
        var creator = await GetOwnedCreatorAsync(cancellationToken).ConfigureAwait(false);
        var link = (creator.ExternalLinks ?? []).FirstOrDefault(x => x.Id == linkId)
            ?? throw new KeyNotFoundException("Profile link not found.");
        var replacement = CreateLink(request, link.Order, link.Id);
        link.Title = replacement.Title; link.Url = replacement.Url;
        await SaveCreatorAsync(creator, cancellationToken).ConfigureAwait(false);
        return ToLinkResponse(link);
    }

    public async Task DeleteLinkAsync(string linkId, CancellationToken cancellationToken = default)
    {
        var creator = await GetOwnedCreatorAsync(cancellationToken).ConfigureAwait(false);
        if (!(creator.ExternalLinks ??= []).RemoveAll(x => x.Id == linkId).Equals(0))
        {
            NormalizeOrder(creator.ExternalLinks);
            await SaveCreatorAsync(creator, cancellationToken).ConfigureAwait(false);
        }
    }

    public async Task ReorderLinksAsync(UpdateProfileLinkOrderRequest request, CancellationToken cancellationToken = default)
    {
        var creator = await GetOwnedCreatorAsync(cancellationToken).ConfigureAwait(false);
        var links = creator.ExternalLinks ??= [];
        var ids = request.LinkIds ?? [];
        if (ids.Count != links.Count || ids.Distinct(StringComparer.Ordinal).Count() != ids.Count || ids.Any(id => links.All(x => x.Id != id)))
            throw new ArgumentException("The order must include every profile link exactly once.");
        for (var i = 0; i < ids.Count; i++) links.First(x => x.Id == ids[i]).Order = i;
        await SaveCreatorAsync(creator, cancellationToken).ConfigureAwait(false);
    }

    private async Task<CreatorDocument> GetOwnedCreatorAsync(CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        var creator = await _creators.GetByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return creator ?? throw new KeyNotFoundException("Creator profile not found.");
    }

    private async Task SaveCreatorAsync(CreatorDocument creator, CancellationToken cancellationToken)
    {
        creator.UpdatedUtc = DateTime.UtcNow;
        await _creators.UpdateAsync(creator, cancellationToken).ConfigureAwait(false);
    }

    private ProfileLinkDocument CreateLink(CreateProfileLinkRequest request, int order, string? id = null)
    {
        var title = request.Title?.Trim();
        var url = request.Url?.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length > _profileOptions.ExternalLinkTitleMaxLength)
            throw new ArgumentException("A valid link title is required.");
        if (string.IsNullOrWhiteSpace(url) || url.Length > _profileOptions.ExternalLinkUrlMaxLength
            || !Uri.TryCreate(url, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("Link URL must be an absolute http(s) URL.");
        return new ProfileLinkDocument { Id = id ?? IdGenerator.NewProfileLinkId(), Title = title, Url = url, Order = order };
    }

    private static ProfileLinkResponse ToLinkResponse(ProfileLinkDocument link) =>
        new() { Id = link.Id, Title = link.Title, Url = link.Url };

    private static void NormalizeOrder(List<ProfileLinkDocument> links)
    {
        foreach (var pair in links.OrderBy(x => x.Order).Select((link, index) => (link, index))) pair.link.Order = pair.index;
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private async Task EnsurePublicCatalogueAsync(string userId, CancellationToken cancellationToken)
    {
        if (!await _entitlement.HasPublicEntitlementAsync(userId, cancellationToken).ConfigureAwait(false))
        {
            throw new KeyNotFoundException("Creator not found.");
        }
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();
}
