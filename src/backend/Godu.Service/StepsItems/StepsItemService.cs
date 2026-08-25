using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Godu.Service.TikTok;
using Godu.Service.Validation;
using Godu.Utility;

namespace Godu.Service.StepsItems;

public sealed class StepsItemService : IStepsItemService
{
    private readonly IStepsItemRepository _repository;
    private readonly ILinkedPlatformAccountRepository _platformAccounts;
    private readonly ICurrentUser _currentUser;
    private readonly ITikTokVideoOwnershipVerifier _ownership;
    private readonly ICreatorService _creators;
    private readonly ICreatorEntitlementService _entitlement;

    public StepsItemService(
        IStepsItemRepository repository,
        ILinkedPlatformAccountRepository platformAccounts,
        ICurrentUser currentUser,
        ITikTokVideoOwnershipVerifier ownership,
        ICreatorService creators,
        ICreatorEntitlementService entitlement)
    {
        _repository = repository;
        _platformAccounts = platformAccounts;
        _currentUser = currentUser;
        _ownership = ownership;
        _creators = creators;
        _entitlement = entitlement;
    }

    public async Task<IReadOnlyList<StepsItemResponse>> ListMineAsync(
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var items = await _repository
            .ListByUserAsync(userId, includeArchived, cancellationToken)
            .ConfigureAwait(false);
        var accounts = await _platformAccounts
            .ListByUserAsync(userId, cancellationToken)
            .ConfigureAwait(false);
        return items.Select(item => ToResponse(item, accounts)).ToList();
    }

    public async Task<StepsItemResponse> GetMineAsync(string id, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var item = await _repository.GetByIdAsync(id, userId, cancellationToken).ConfigureAwait(false);
        if (item is null)
        {
            throw new KeyNotFoundException("Steps item not found.");
        }

        return await ToResponseAsync(item, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse> CreateMineAsync(
        CreateStepsItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var useVideo = request.UseVideoContent;
        ValidateSteps(request.Steps, useVideo ? request.Video?.DurationSeconds : null, useVideo);
        var video = StepsItemMapper.ToVideoDocument(request.Video, useVideo);

        var now = DateTime.UtcNow;
        var slug = SlugUtilities.Canonicalise(request.Slug);
        if (!string.IsNullOrEmpty(slug) && !SlugUtilities.IsValid(slug))
        {
            throw new ArgumentException("Slug contains invalid characters.");
        }

        var document = new StepsItemDocument
        {
            Id = IdGenerator.NewStepsItemId(),
            CreatedByUserId = userId,
            LinkedPlatformAccountId = null,
            Visibility = StepsItemMapper.VisibilityName(StepsVisibility.Private),
            Status = StepsItemMapper.StatusName(StepsItemStatus.Published),
            Slug = string.IsNullOrEmpty(slug) ? null : slug,
            Title = request.Title.Trim(),
            Description = request.Description,
            CreatorDisplayName = request.CreatorDisplayName,
            ContinuousSoundtrack = useVideo && request.ContinuousSoundtrack,
            GapSeconds = NormalizeGapSeconds(request.GapSeconds),
            GapMessage = NormalizeGapMessage(request.GapMessage, request.GapSeconds),
            PlayGapPriorToStart = useVideo && request.PlayGapPriorToStart,
            StartGapSeconds = useVideo && request.PlayGapPriorToStart
                ? NormalizeGapSeconds(request.StartGapSeconds)
                : null,
            StartGapMessage = useVideo && request.PlayGapPriorToStart
                ? TrimGapMessage(request.StartGapMessage)
                : null,
            RepeatCount = NormalizeRepeatCount(request.RepeatCount),
            UseVideoContent = useVideo,
            Video = video,
            Steps = StepsItemMapper.ToStepDocuments(request.Steps),
            CreatedUtc = now,
            UpdatedUtc = now,
            PublishedUtc = now,
        };

        var created = await _repository.CreateAsync(document, cancellationToken).ConfigureAwait(false);
        return await ToResponseAsync(created, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse> UpdateMineAsync(
        string id,
        UpdateStepsItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var useVideo = request.UseVideoContent;
        ValidateSteps(request.Steps, useVideo ? request.Video?.DurationSeconds : null, useVideo);
        var video = StepsItemMapper.ToVideoDocument(request.Video, useVideo);

        var existing = await _repository.GetByIdAsync(id, userId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            throw new KeyNotFoundException("Steps item not found.");
        }

        if (string.Equals(existing.Status, "archived", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Archived steps cannot be updated.");
        }

        var slug = SpecSlug(request.Slug);

        existing.Title = request.Title.Trim();
        existing.Description = request.Description;
        existing.CreatorDisplayName = request.CreatorDisplayName;
        existing.ContinuousSoundtrack = useVideo && request.ContinuousSoundtrack;
        existing.GapSeconds = NormalizeGapSeconds(request.GapSeconds);
        existing.GapMessage = NormalizeGapMessage(request.GapMessage, request.GapSeconds);
        existing.PlayGapPriorToStart = useVideo && request.PlayGapPriorToStart;
        existing.StartGapSeconds = useVideo && request.PlayGapPriorToStart
            ? NormalizeGapSeconds(request.StartGapSeconds)
            : null;
        existing.StartGapMessage = useVideo && request.PlayGapPriorToStart
            ? TrimGapMessage(request.StartGapMessage)
            : null;
        existing.RepeatCount = NormalizeRepeatCount(request.RepeatCount);
        existing.UseVideoContent = useVideo;
        existing.Slug = slug;
        existing.Video = video;
        existing.Steps = StepsItemMapper.ToStepDocuments(request.Steps);
        existing.UpdatedUtc = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
        return await ToResponseAsync(updated, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse> ArchiveMineAsync(string id, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var existing = await _repository.GetByIdAsync(id, userId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            throw new KeyNotFoundException("Steps item not found.");
        }

        existing.Status = StepsItemMapper.StatusName(StepsItemStatus.Archived);
        existing.UpdatedUtc = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
        return await ToResponseAsync(updated, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse?> GetPublicAsync(
        string providerAlias,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default)
    {
        if (!ProviderUtilities.TryCanonicalise(providerAlias, out var provider))
        {
            return null;
        }

        var canonicalSlug = SlugUtilities.Canonicalise(slug);
        var username = platformUsername.Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrEmpty(canonicalSlug) || string.IsNullOrEmpty(username))
        {
            return null;
        }

        var currentOwner = await _platformAccounts
            .GetVerifiedByCurrentUsernameAsync(provider, username, cancellationToken)
            .ConfigureAwait(false);
        if (currentOwner is not null)
        {
            var owned = await _repository
                .GetPublicByAccountSlugAsync(
                    currentOwner.UserId,
                    currentOwner.Id,
                    canonicalSlug,
                    cancellationToken)
                .ConfigureAwait(false);
            if (owned is not null)
            {
                return await ToPublicResponseAsync(owned, cancellationToken).ConfigureAwait(false);
            }
        }

        var previousOwners = await _platformAccounts
            .ListVerifiedByAliasAsync(provider, username, cancellationToken)
            .ConfigureAwait(false);
        foreach (var previous in previousOwners)
        {
            var inherited = await _repository
                .GetPublicByAccountSlugAsync(
                    previous.UserId,
                    previous.Id,
                    canonicalSlug,
                    cancellationToken)
                .ConfigureAwait(false);
            if (inherited is not null)
            {
                return await ToPublicResponseAsync(inherited, cancellationToken).ConfigureAwait(false);
            }
        }

        var item = await _repository
            .GetPublicBySlugAsync(provider, username, canonicalSlug, cancellationToken)
            .ConfigureAwait(false);

        return item is null
            ? null
            : await ToPublicResponseAsync(item, cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<StepsItemResponse>> ListPublicByUsernameAsync(
        string providerAlias,
        string platformUsername,
        CancellationToken cancellationToken = default)
    {
        if (!ProviderUtilities.TryCanonicalise(providerAlias, out var provider))
        {
            return [];
        }

        var username = platformUsername.Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrEmpty(username))
        {
            return [];
        }

        var items = await _repository
            .ListPublicByUsernameAsync(provider, username, cancellationToken)
            .ConfigureAwait(false);
        return await MapPublicManyAsync(items, cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<StepsItemResponse>> ListRelatedPublicAsync(
        string providerAlias,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default)
    {
        var current = await GetPublicAsync(providerAlias, platformUsername, slug, cancellationToken)
            .ConfigureAwait(false);
        if (current?.LinkedPlatformAccountId is null)
        {
            return [];
        }

        var related = await _repository
            .ListPublicByLinkedAccountAsync(
                current.CreatedByUserId,
                current.LinkedPlatformAccountId,
                current.Id,
                take: 4,
                cancellationToken)
            .ConfigureAwait(false);
        return await MapPublicManyAsync(related, cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<StepsItemResponse>> ListMinePublicAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var items = await _repository
            .ListPublicByUserAsync(userId, cancellationToken)
            .ConfigureAwait(false);
        return await MapManyAsync(items, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse> PublishMineAsync(
        string id,
        PublishStepsItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var existing = await _repository.GetByIdAsync(id, userId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            throw new KeyNotFoundException("Steps item not found.");
        }

        if (string.Equals(existing.Status, "archived", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Archived steps cannot be published.");
        }

        if (!await _entitlement.CanPublishPublicAsync(userId, cancellationToken).ConfigureAwait(false))
        {
            throw new InvalidOperationException(
                "Publishing is unavailable. Your creator trial has ended.");
        }

        var slug = SpecSlug(request.Slug);
        if (string.IsNullOrEmpty(slug))
        {
            slug = SpecSlug(SlugUtilities.FromTitle(existing.Title));
        }

        if (string.IsNullOrEmpty(slug))
        {
            throw new ArgumentException("A public URL slug is required.");
        }

        if (StepsItemMapper.UsesVideoContent(existing)
            && string.IsNullOrWhiteSpace(existing.Video.ExternalVideoId))
        {
            throw new InvalidOperationException("A TikTok video is required to publish.");
        }

        var account = await ResolvePublishAccountAsync(userId, existing, request.LinkedPlatformAccountId, cancellationToken)
            .ConfigureAwait(false);

        if (!account.IsVerified)
        {
            throw new InvalidOperationException("A verified TikTok account is required to publish.");
        }

        if (StepsItemMapper.UsesVideoContent(existing))
        {
            var owned = await _ownership
                .OwnsVideoAsync(account, existing.Video.ExternalVideoId, cancellationToken)
                .ConfigureAwait(false);
            if (!owned)
            {
                throw new InvalidOperationException("This TikTok video is not owned by the linked account.");
            }
        }

        var taken = await _repository
            .SlugTakenAsync(userId, account.Id, slug, existing.Id, cancellationToken)
            .ConfigureAwait(false);
        if (taken)
        {
            throw new SlugConflictException();
        }

        var displayName = account.DisplayName?.Trim();
        if (string.IsNullOrEmpty(displayName))
        {
            displayName = $"@{account.Username}";
        }

        await _creators
            .EnsureForUserAsync(userId, displayName, account.AvatarUrl, account.Bio, cancellationToken)
            .ConfigureAwait(false);

        existing.Visibility = StepsItemMapper.VisibilityName(StepsVisibility.Public);
        existing.Status = StepsItemMapper.StatusName(StepsItemStatus.Published);
        existing.Slug = slug;
        existing.LinkedPlatformAccountId = account.Id;
        existing.CreatorDisplayName = displayName;
        existing.Video.CreatorUsername = account.Username.Trim().ToLowerInvariant();
        existing.Video.CreatorExternalAccountId = account.ExternalAccountId;
        var publishedUtc = DateTime.UtcNow;
        existing.PublishedUtc = publishedUtc;
        existing.UpdatedUtc = publishedUtc;

        var updated = await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
        await _entitlement
            .StartTrialIfNeededAsync(userId, publishedUtc, existing.Id, cancellationToken)
            .ConfigureAwait(false);
        return await ToResponseAsync(updated, cancellationToken).ConfigureAwait(false);
    }

    public async Task<StepsItemResponse> UnpublishMineAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var existing = await _repository.GetByIdAsync(id, userId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            throw new KeyNotFoundException("Steps item not found.");
        }

        existing.Visibility = StepsItemMapper.VisibilityName(StepsVisibility.Private);
        existing.UpdatedUtc = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
        return await ToResponseAsync(updated, cancellationToken).ConfigureAwait(false);
    }

    private async Task<LinkedPlatformAccountDocument> ResolvePublishAccountAsync(
        string userId,
        StepsItemDocument item,
        string? requestedAccountId,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(requestedAccountId))
        {
            var requested = await _platformAccounts
                .GetByIdAsync(requestedAccountId, userId, cancellationToken)
                .ConfigureAwait(false);
            if (requested is null)
            {
                throw new InvalidOperationException("Linked account not found.");
            }

            EnsureAccountMatchesVideo(item, requested);
            return requested;
        }

        var accounts = await _platformAccounts.ListByUserAsync(userId, cancellationToken).ConfigureAwait(false);
        var tiktok = accounts
            .Where(a => a.IsVerified && string.Equals(a.Provider, "tiktok", StringComparison.OrdinalIgnoreCase))
            .ToList();
        if (tiktok.Count == 0)
        {
            throw new InvalidOperationException("Connect a verified TikTok account in Settings before publishing.");
        }

        var videoOpenId = item.Video.CreatorExternalAccountId?.Trim();
        if (!string.IsNullOrEmpty(videoOpenId))
        {
            var byId = tiktok.FirstOrDefault(a =>
                string.Equals(a.ExternalAccountId, videoOpenId, StringComparison.Ordinal));
            if (byId is not null)
            {
                return byId;
            }

            throw new InvalidOperationException("This TikTok video is not from a linked account.");
        }

        var videoHandle = item.Video.CreatorUsername?.Trim().TrimStart('@');
        var matching = tiktok.FirstOrDefault(a =>
            !string.IsNullOrWhiteSpace(videoHandle)
            && (string.Equals(a.Username, videoHandle, StringComparison.OrdinalIgnoreCase)
                || a.UsernameAliases.Contains(videoHandle, StringComparer.OrdinalIgnoreCase)));

        if (matching is not null)
        {
            return matching;
        }

        if (!string.IsNullOrWhiteSpace(videoHandle))
        {
            throw new InvalidOperationException("This TikTok video is not from a linked account.");
        }

        if (tiktok.Count == 1)
        {
            return tiktok[0];
        }

        throw new InvalidOperationException(
            "Choose which verified TikTok account owns this video.");
    }

    private static void EnsureAccountMatchesVideo(
        StepsItemDocument item,
        LinkedPlatformAccountDocument account)
    {
        var videoOpenId = item.Video.CreatorExternalAccountId?.Trim();
        if (!string.IsNullOrEmpty(videoOpenId))
        {
            if (!string.Equals(account.ExternalAccountId, videoOpenId, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("This TikTok video is not from a linked account.");
            }

            return;
        }

        var videoHandle = item.Video.CreatorUsername?.Trim().TrimStart('@');
        if (string.IsNullOrWhiteSpace(videoHandle))
        {
            return;
        }

        if (string.Equals(account.Username, videoHandle, StringComparison.OrdinalIgnoreCase)
            || account.UsernameAliases.Contains(videoHandle, StringComparer.OrdinalIgnoreCase))
        {
            return;
        }

        throw new InvalidOperationException("This TikTok video is not from a linked account.");
    }

    private async Task<StepsItemResponse?> ToPublicResponseAsync(
        StepsItemDocument document,
        CancellationToken cancellationToken)
    {
        if (!await _entitlement
                .HasPublicEntitlementAsync(document.CreatedByUserId, cancellationToken)
                .ConfigureAwait(false))
        {
            return null;
        }

        return await ToResponseAsync(document, cancellationToken).ConfigureAwait(false);
    }

    private async Task<IReadOnlyList<StepsItemResponse>> MapPublicManyAsync(
        IReadOnlyList<StepsItemDocument> items,
        CancellationToken cancellationToken)
    {
        var allowed = new Dictionary<string, bool>(StringComparer.Ordinal);
        var results = new List<StepsItemResponse>();
        foreach (var item in items)
        {
            if (!allowed.TryGetValue(item.CreatedByUserId, out var visible))
            {
                visible = await _entitlement
                    .HasPublicEntitlementAsync(item.CreatedByUserId, cancellationToken)
                    .ConfigureAwait(false);
                allowed[item.CreatedByUserId] = visible;
            }

            if (!visible)
            {
                continue;
            }

            results.Add(await ToResponseAsync(item, cancellationToken).ConfigureAwait(false));
        }

        return results;
    }

    private async Task<IReadOnlyList<StepsItemResponse>> MapManyAsync(
        IReadOnlyList<StepsItemDocument> items,
        CancellationToken cancellationToken)
    {
        var results = new List<StepsItemResponse>(items.Count);
        foreach (var item in items)
        {
            results.Add(await ToResponseAsync(item, cancellationToken).ConfigureAwait(false));
        }

        return results;
    }

    private async Task<StepsItemResponse> ToResponseAsync(
        StepsItemDocument document,
        CancellationToken cancellationToken)
    {
        var accounts = await _platformAccounts
            .ListByUserAsync(document.CreatedByUserId, cancellationToken)
            .ConfigureAwait(false);
        return ToResponse(document, accounts);
    }

    private static StepsItemResponse ToResponse(
        StepsItemDocument document,
        IReadOnlyList<LinkedPlatformAccountDocument> accounts)
    {
        return StepsItemMapper.ToResponse(
            document,
            CreatorSocialMapper.Combine(accounts, document.Video));
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private static void ValidateSteps(
        IEnumerable<StepDefinitionRequest> steps,
        double? videoDuration,
        bool useVideoContent = true)
    {
        var errors = StepDefinitionValidator.Validate(steps, videoDuration, useVideoContent);
        if (errors.Count > 0)
        {
            throw new ArgumentException(string.Join(" ", errors));
        }
    }

    private static int? NormalizeGapSeconds(int? gapSeconds)
    {
        if (gapSeconds is null or <= 0)
        {
            return null;
        }

        if (gapSeconds > 600)
        {
            throw new ArgumentException("Gap seconds must be between 1 and 600.");
        }

        return gapSeconds;
    }

    private static int? NormalizeRepeatCount(int? repeatCount)
    {
        if (repeatCount is null or < 2)
        {
            return null;
        }

        if (repeatCount > 99)
        {
            throw new ArgumentException("Repeat count must be between 2 and 99.");
        }

        return repeatCount;
    }

    private static string? NormalizeGapMessage(string? message, int? gapSeconds)
    {
        if (NormalizeGapSeconds(gapSeconds) is null)
        {
            return null;
        }

        return TrimGapMessage(message);
    }

    private static string? TrimGapMessage(string? message)
    {
        var trimmed = message?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        if (trimmed.Length > 200)
        {
            throw new ArgumentException("Gap message must be 200 characters or fewer.");
        }

        return trimmed;
    }

    private static string? SpecSlug(string? slug)
    {
        var canonical = SlugUtilities.Canonicalise(slug);
        if (string.IsNullOrEmpty(canonical))
        {
            return null;
        }

        if (!SlugUtilities.IsValid(canonical))
        {
            throw new ArgumentException("Slug contains invalid characters.");
        }

        return canonical;
    }
}
