using System.Collections.Concurrent;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Utility;

namespace Godu.Repository.StepsItems;

public sealed class InMemoryStepsItemRepository : IStepsItemRepository
{
    private readonly ConcurrentDictionary<string, StepsItemDocument> _store = new(StringComparer.Ordinal);

    public Task<StepsItemDocument?> GetByIdAsync(
        string id,
        string createdByUserId,
        CancellationToken cancellationToken = default)
    {
        if (!_store.TryGetValue(id, out var item))
        {
            return Task.FromResult<StepsItemDocument?>(null);
        }

        if (!string.Equals(item.CreatedByUserId, createdByUserId, StringComparison.Ordinal))
        {
            return Task.FromResult<StepsItemDocument?>(null);
        }

        return Task.FromResult<StepsItemDocument?>(Clone(item));
    }

    public Task<IReadOnlyList<StepsItemDocument>> ListByUserAsync(
        string createdByUserId,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(x => string.Equals(x.CreatedByUserId, createdByUserId, StringComparison.Ordinal))
            .Where(x => includeArchived || !string.Equals(x.Status, "archived", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.UpdatedUtc)
            .Select(Clone)
            .ToList();

        return Task.FromResult<IReadOnlyList<StepsItemDocument>>(items);
    }

    public Task<StepsItemDocument?> GetPublicBySlugAsync(
        string provider,
        string platformUsername,
        string slug,
        CancellationToken cancellationToken = default)
    {
        var match = _store.Values.FirstOrDefault(x =>
            string.Equals(x.Status, StepsItemMapperStatus.Published, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Visibility, StepsItemMapperStatus.Public, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Video.Provider, provider, StringComparison.OrdinalIgnoreCase)
            && string.Equals(x.Video.CreatorUsername, platformUsername, StringComparison.OrdinalIgnoreCase));

        return Task.FromResult(match is null ? null : Clone(match));
    }

    public Task<IReadOnlyList<StepsItemDocument>> ListPublicByUserAsync(
        string createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var items = PublicOwned(createdByUserId)
            .OrderByDescending(x => x.PublishedUtc ?? x.UpdatedUtc)
            .Select(Clone)
            .ToList();
        return Task.FromResult<IReadOnlyList<StepsItemDocument>>(items);
    }

    public Task<IReadOnlyList<StepsItemDocument>> ListPublicByLinkedAccountAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string? excludeItemId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var items = PublicOwned(createdByUserId)
            .Where(x => string.Equals(x.LinkedPlatformAccountId, linkedPlatformAccountId, StringComparison.Ordinal))
            .Where(x => excludeItemId is null || !string.Equals(x.Id, excludeItemId, StringComparison.Ordinal))
            .OrderByDescending(x => x.PublishedUtc ?? x.UpdatedUtc)
            .Take(Math.Max(0, take))
            .Select(Clone)
            .ToList();
        return Task.FromResult<IReadOnlyList<StepsItemDocument>>(items);
    }

    public Task<IReadOnlyList<StepsItemDocument>> ListPublicByUsernameAsync(
        string provider,
        string platformUsername,
        CancellationToken cancellationToken = default)
    {
        var items = _store.Values
            .Where(IsPublicPublished)
            .Where(x =>
                string.Equals(x.Video.Provider, provider, StringComparison.OrdinalIgnoreCase)
                && string.Equals(x.Video.CreatorUsername, platformUsername, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.PublishedUtc ?? x.UpdatedUtc)
            .Select(Clone)
            .ToList();
        return Task.FromResult<IReadOnlyList<StepsItemDocument>>(items);
    }

    public Task<StepsItemDocument?> GetPublicByAccountSlugAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string slug,
        CancellationToken cancellationToken = default)
    {
        var match = PublicOwned(createdByUserId).FirstOrDefault(x =>
            string.Equals(x.LinkedPlatformAccountId, linkedPlatformAccountId, StringComparison.Ordinal)
            && string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(match is null ? null : Clone(match));
    }

    public Task<int> RewriteCreatorHandleAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string fromUsername,
        string toUsername,
        CancellationToken cancellationToken = default)
    {
        var from = fromUsername.Trim().TrimStart('@').ToLowerInvariant();
        var to = toUsername.Trim().TrimStart('@').ToLowerInvariant();
        var count = 0;
        foreach (var item in _store.Values.Where(x =>
                     string.Equals(x.CreatedByUserId, createdByUserId, StringComparison.Ordinal)
                     && (string.Equals(x.LinkedPlatformAccountId, linkedPlatformAccountId, StringComparison.Ordinal)
                         || string.Equals(x.Video.CreatorUsername, from, StringComparison.OrdinalIgnoreCase))))
        {
            item.Video.CreatorUsername = to;
            item.Video.SourceUrl = TikTokHandleUrls.RewriteSourceUrl(item.Video.SourceUrl, from, to);
            item.UpdatedUtc = DateTime.UtcNow;
            count++;
        }

        return Task.FromResult(count);
    }

    public Task<bool> SlugTakenAsync(
        string createdByUserId,
        string linkedPlatformAccountId,
        string slug,
        string? excludeItemId,
        CancellationToken cancellationToken = default)
    {
        var taken = PublicOwned(createdByUserId).Any(x =>
            string.Equals(x.LinkedPlatformAccountId, linkedPlatformAccountId, StringComparison.Ordinal)
            && string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase)
            && (excludeItemId is null || !string.Equals(x.Id, excludeItemId, StringComparison.Ordinal)));
        return Task.FromResult(taken);
    }

    private IEnumerable<StepsItemDocument> PublicOwned(string createdByUserId) =>
        _store.Values
            .Where(x => string.Equals(x.CreatedByUserId, createdByUserId, StringComparison.Ordinal))
            .Where(IsPublicPublished);

    private static bool IsPublicPublished(StepsItemDocument item) =>
        string.Equals(item.Status, StepsItemMapperStatus.Published, StringComparison.OrdinalIgnoreCase)
        && string.Equals(item.Visibility, StepsItemMapperStatus.Public, StringComparison.OrdinalIgnoreCase);

    public Task<StepsItemDocument> CreateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default)
    {
        var stored = Clone(item);
        if (!_store.TryAdd(stored.Id, stored))
        {
            throw new InvalidOperationException($"Steps item already exists: {stored.Id}");
        }

        return Task.FromResult(Clone(stored));
    }

    public Task<StepsItemDocument> UpdateAsync(
        StepsItemDocument item,
        CancellationToken cancellationToken = default)
    {
        if (!_store.ContainsKey(item.Id))
        {
            throw new InvalidOperationException($"Steps item not found: {item.Id}");
        }

        var stored = Clone(item);
        _store[item.Id] = stored;
        return Task.FromResult(Clone(stored));
    }

    private static StepsItemDocument Clone(StepsItemDocument item)
    {
        return new StepsItemDocument
        {
            Id = item.Id,
            CreatedByUserId = item.CreatedByUserId,
            LinkedPlatformAccountId = item.LinkedPlatformAccountId,
            Visibility = item.Visibility,
            Status = item.Status,
            Slug = item.Slug,
            Title = item.Title,
            Description = item.Description,
            CreatorDisplayName = item.CreatorDisplayName,
            ContinuousSoundtrack = item.ContinuousSoundtrack,
            GapSeconds = item.GapSeconds,
            GapMessage = item.GapMessage,
            PlayGapPriorToStart = item.PlayGapPriorToStart,
            StartGapSeconds = item.StartGapSeconds,
            StartGapMessage = item.StartGapMessage,
            CreatedUtc = item.CreatedUtc,
            UpdatedUtc = item.UpdatedUtc,
            PublishedUtc = item.PublishedUtc,
            Video = new VideoReferenceDocument
            {
                Provider = item.Video.Provider,
                ExternalVideoId = item.Video.ExternalVideoId,
                SourceUrl = item.Video.SourceUrl,
                CreatorExternalAccountId = item.Video.CreatorExternalAccountId,
                CreatorUsername = item.Video.CreatorUsername,
                ThumbnailUrl = item.Video.ThumbnailUrl,
                DurationSeconds = item.Video.DurationSeconds,
            },
            Steps = item.Steps
                .Select(s => new StepDefinitionDocument
                {
                    Id = s.Id,
                    Order = s.Order,
                    Kind = s.Kind,
                    Title = s.Title,
                    Description = s.Description,
                    StartSeconds = s.StartSeconds,
                    EndSeconds = s.EndSeconds,
                    DurationSeconds = s.DurationSeconds,
                    AutoAdvance = s.AutoAdvance,
                    LoopVideo = s.LoopVideo,
                    Message = s.Message,
                })
                .ToList(),
        };
    }

    private static class StepsItemMapperStatus
    {
        public const string Published = "published";
        public const string Public = "public";
    }
}
