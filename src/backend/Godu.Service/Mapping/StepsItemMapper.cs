using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Utility;

namespace Godu.Service.Mapping;

public static class StepsItemMapper
{
    public static StepsItemResponse ToResponse(
        StepsItemDocument document,
        IReadOnlyList<CreatorSocialResponse>? creatorSocials = null)
    {
        return new StepsItemResponse
        {
            Id = document.Id,
            CreatedByUserId = document.CreatedByUserId,
            LinkedPlatformAccountId = document.LinkedPlatformAccountId,
            Visibility = document.Visibility,
            Status = document.Status,
            Slug = document.Slug,
            Title = document.Title,
            Description = document.Description,
            CreatorDisplayName = document.CreatorDisplayName,
            CreatorSocials = creatorSocials ?? [],
            ContinuousSoundtrack = document.ContinuousSoundtrack,
            GapSeconds = document.GapSeconds,
            GapMessage = document.GapMessage,
            CreatedUtc = document.CreatedUtc,
            UpdatedUtc = document.UpdatedUtc,
            PublishedUtc = document.PublishedUtc,
            Video = new VideoReferenceResponse
            {
                Provider = document.Video.Provider,
                ExternalVideoId = document.Video.ExternalVideoId,
                SourceUrl = document.Video.SourceUrl,
                CreatorExternalAccountId = document.Video.CreatorExternalAccountId,
                CreatorUsername = document.Video.CreatorUsername,
                ThumbnailUrl = document.Video.ThumbnailUrl,
                DurationSeconds = document.Video.DurationSeconds,
            },
            Steps = document.Steps
                .OrderBy(s => s.Order)
                .Select(s => new StepDefinitionResponse
                {
                    Id = s.Id,
                    Order = s.Order,
                    Title = s.Title,
                    Description = s.Description,
                    StartSeconds = s.StartSeconds,
                    EndSeconds = s.EndSeconds,
                    DurationSeconds = s.DurationSeconds,
                    AutoAdvance = s.AutoAdvance,
                })
                .ToList(),
        };
    }

    public static List<StepDefinitionDocument> ToStepDocuments(IEnumerable<StepDefinitionRequest> steps)
    {
        return steps
            .Select(s => new StepDefinitionDocument
            {
                Id = string.IsNullOrWhiteSpace(s.Id) ? IdGenerator.NewStepId() : s.Id,
                Order = s.Order,
                Title = s.Title.Trim(),
                Description = s.Description,
                StartSeconds = s.StartSeconds,
                EndSeconds = s.EndSeconds,
                DurationSeconds = s.DurationSeconds,
                AutoAdvance = s.AutoAdvance,
            })
            .ToList();
    }

    public static VideoReferenceDocument ToVideoDocument(VideoReferenceRequest video)
    {
        return new VideoReferenceDocument
        {
            Provider = video.Provider.Trim().ToLowerInvariant(),
            ExternalVideoId = video.ExternalVideoId.Trim(),
            SourceUrl = video.SourceUrl.Trim(),
            CreatorExternalAccountId = video.CreatorExternalAccountId,
            CreatorUsername = video.CreatorUsername?.Trim().ToLowerInvariant(),
            ThumbnailUrl = video.ThumbnailUrl,
            DurationSeconds = video.DurationSeconds,
        };
    }

    public static string VisibilityName(StepsVisibility visibility) =>
        visibility switch
        {
            StepsVisibility.Private => "private",
            StepsVisibility.Public => "public",
            StepsVisibility.Unlisted => "unlisted",
            _ => "private",
        };

    public static string StatusName(StepsItemStatus status) =>
        status switch
        {
            StepsItemStatus.Draft => "draft",
            StepsItemStatus.Published => "published",
            StepsItemStatus.Archived => "archived",
            _ => "draft",
        };
}
