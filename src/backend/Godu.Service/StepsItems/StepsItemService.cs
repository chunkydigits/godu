using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Service.Identity;
using Godu.Service.Mapping;
using Godu.Service.Validation;
using Godu.Utility;

namespace Godu.Service.StepsItems;

public sealed class StepsItemService : IStepsItemService
{
    private readonly IStepsItemRepository _repository;
    private readonly ILinkedPlatformAccountRepository _platformAccounts;
    private readonly ICurrentUser _currentUser;

    public StepsItemService(
        IStepsItemRepository repository,
        ILinkedPlatformAccountRepository platformAccounts,
        ICurrentUser currentUser)
    {
        _repository = repository;
        _platformAccounts = platformAccounts;
        _currentUser = currentUser;
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
        ValidateSteps(request.Steps, request.Video.DurationSeconds);

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
            ContinuousSoundtrack = request.ContinuousSoundtrack,
            GapSeconds = NormalizeGapSeconds(request.GapSeconds),
            GapMessage = NormalizeGapMessage(request.GapMessage, request.GapSeconds),
            Video = StepsItemMapper.ToVideoDocument(request.Video),
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
        ValidateSteps(request.Steps, request.Video.DurationSeconds);

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
        existing.ContinuousSoundtrack = request.ContinuousSoundtrack;
        existing.GapSeconds = NormalizeGapSeconds(request.GapSeconds);
        existing.GapMessage = NormalizeGapMessage(request.GapMessage, request.GapSeconds);
        existing.Slug = slug;
        existing.Video = StepsItemMapper.ToVideoDocument(request.Video);
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
        var username = platformUsername.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(canonicalSlug) || string.IsNullOrEmpty(username))
        {
            return null;
        }

        var item = await _repository
            .GetPublicBySlugAsync(provider, username, canonicalSlug, cancellationToken)
            .ConfigureAwait(false);

        return item is null
            ? null
            : await ToResponseAsync(item, cancellationToken).ConfigureAwait(false);
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

    private static void ValidateSteps(IEnumerable<StepDefinitionRequest> steps, double? videoDuration)
    {
        var errors = StepDefinitionValidator.Validate(steps, videoDuration);
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

    private static string? NormalizeGapMessage(string? message, int? gapSeconds)
    {
        if (NormalizeGapSeconds(gapSeconds) is null)
        {
            return null;
        }

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
