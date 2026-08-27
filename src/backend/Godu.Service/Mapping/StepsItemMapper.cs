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
            PlayGapPriorToStart = document.PlayGapPriorToStart,
            StartGapSeconds = document.StartGapSeconds,
            StartGapMessage = document.StartGapMessage,
            RepeatCount = document.RepeatCount,
            TimingBeepSeconds = document.TimingBeepSeconds,
            UseVideoContent = UsesVideoContent(document),
            CreatedUtc = document.CreatedUtc,
            UpdatedUtc = document.UpdatedUtc,
            PublishedUtc = document.PublishedUtc,
            PublicPath = PublicPathFor(document),
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
                    Kind = StepEntryKinds.Normalise(s.Kind),
                    Title = s.Title,
                    Description = s.Description,
                    StartSeconds = s.StartSeconds,
                    EndSeconds = s.EndSeconds,
                    DurationSeconds = s.DurationSeconds,
                    AutoAdvance = s.AutoAdvance,
                    LoopVideo = s.LoopVideo,
                    Message = s.Message,
                    BackgroundColor = s.BackgroundColor,
                    TextColor = s.TextColor,
                    StillSeconds = s.StillSeconds,
                })
                .ToList(),
        };
    }

    public static PublicStepsSummaryResponse ToPublicSummary(StepsItemDocument document)
    {
        var username = document.Video.CreatorUsername?.Trim().TrimStart('@').ToLowerInvariant() ?? string.Empty;
        return new PublicStepsSummaryResponse
        {
            Id = document.Id,
            Title = document.Title,
            Description = document.Description,
            Slug = document.Slug ?? string.Empty,
            Provider = document.Video.Provider,
            Username = username,
            StepCount = document.Steps.Count(s => !StepEntryKinds.IsGap(s.Kind)),
            PublicPath = PublicPathFor(document),
        };
    }

    public static List<StepDefinitionDocument> ToStepDocuments(IEnumerable<StepDefinitionRequest> steps)
    {
        return steps.Select(ToStepDocument).ToList();
    }

    private static StepDefinitionDocument ToStepDocument(StepDefinitionRequest step)
    {
        var id = string.IsNullOrWhiteSpace(step.Id) ? IdGenerator.NewStepId() : step.Id;
        var kind = StepEntryKinds.Normalise(step.Kind);

        // A gap has no clip of its own, so only its length and message are kept.
        if (kind == StepEntryKinds.Gap)
        {
            var message = StepEntryKinds.TrimMessage(step.Message);
            return new StepDefinitionDocument
            {
                Id = id,
                Order = step.Order,
                Kind = kind,
                Title = string.Empty,
                StartSeconds = 0,
                EndSeconds = 0,
                DurationSeconds = step.DurationSeconds,
                AutoAdvance = true,
                Message = message,
            };
        }

        if (kind == StepEntryKinds.Card)
        {
            var message = StepEntryKinds.TrimMessage(step.Message);
            return new StepDefinitionDocument
            {
                Id = id,
                Order = step.Order,
                Kind = kind,
                Title = string.Empty,
                StartSeconds = 0,
                EndSeconds = 0,
                DurationSeconds = step.DurationSeconds,
                AutoAdvance = true,
                Message = message,
                BackgroundColor = StepEntryKinds.NormaliseColour(
                    step.BackgroundColor,
                    StepEntryKinds.DefaultCardBackground),
                TextColor = StepEntryKinds.NormaliseColour(
                    step.TextColor,
                    StepEntryKinds.DefaultCardText),
                StillSeconds = step.StillSeconds,
            };
        }

        return new StepDefinitionDocument
        {
            Id = id,
            Order = step.Order,
            Kind = kind,
            Title = step.Title?.Trim() ?? string.Empty,
            Description = step.Description,
            StartSeconds = step.StartSeconds,
            EndSeconds = step.EndSeconds,
            DurationSeconds = step.DurationSeconds,
            AutoAdvance = step.AutoAdvance,
            LoopVideo = step.LoopVideo ?? true,
        };
    }

    public static bool UsesVideoContent(StepsItemDocument document) =>
        document.UseVideoContent != false
        && !string.Equals(document.Video.Provider, VideoProviders.None, StringComparison.OrdinalIgnoreCase)
        && !string.IsNullOrWhiteSpace(document.Video.ExternalVideoId);

    public static string? PublicPathFor(StepsItemDocument document) =>
        ProviderUtilities.PublicPath(
            PublicUrlProvider(document),
            document.Video.CreatorUsername,
            document.Slug);

    private static string? PublicUrlProvider(StepsItemDocument document)
    {
        if (UsesVideoContent(document))
        {
            return document.Video.Provider;
        }

        return string.IsNullOrWhiteSpace(document.Video.CreatorUsername) ? null : "tiktok";
    }

    public static VideoReferenceDocument ToVideoDocument(VideoReferenceRequest? video, bool useVideoContent)
    {
        if (!useVideoContent)
        {
            return EmptyVideo();
        }

        if (video is null
            || string.IsNullOrWhiteSpace(video.Provider)
            || string.IsNullOrWhiteSpace(video.ExternalVideoId)
            || string.IsNullOrWhiteSpace(video.SourceUrl))
        {
            throw new ArgumentException("A TikTok video is required when video content is on.");
        }

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

    public static VideoReferenceDocument EmptyVideo() =>
        new()
        {
            Provider = VideoProviders.None,
            ExternalVideoId = string.Empty,
            SourceUrl = string.Empty,
        };

    public static VideoReferenceDocument ToVideoDocument(VideoReferenceRequest video) =>
        ToVideoDocument(video, useVideoContent: true);

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
