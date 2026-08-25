using Godu.Model.Documents;
using Godu.Model.Requests;

namespace Godu.Service.Validation;

public static class StepDefinitionValidator
{
    public static IReadOnlyList<string> Validate(
        IEnumerable<StepDefinitionRequest> steps,
        double? videoDurationSeconds = null,
        bool useVideoContent = true)
    {
        var errors = new List<string>();
        var entries = steps.ToList();
        var activityCount = 0;

        foreach (var step in entries)
        {
            if (step.Order < 1)
            {
                errors.Add($"Step order must be >= 1 (got {step.Order}).");
            }

            if (!StepEntryKinds.IsKnown(step.Kind))
            {
                errors.Add($"Step {step.Order}: unknown kind '{step.Kind}'.");
                continue;
            }

            if (StepEntryKinds.IsGap(step.Kind))
            {
                ValidateGap(step, errors);
                continue;
            }

            if (StepEntryKinds.IsCard(step.Kind))
            {
                activityCount++;
                ValidateCard(step, videoDurationSeconds, useVideoContent, errors);
                continue;
            }

            if (!useVideoContent)
            {
                errors.Add($"Step {step.Order}: video steps need a TikTok. Turn video content on, or use a card.");
                continue;
            }

            activityCount++;
            ValidateActivity(step, videoDurationSeconds, errors);
        }

        if (entries.Count > 0 && activityCount == 0)
        {
            errors.Add("At least one step is required.");
        }

        return errors;
    }

    private static void ValidateGap(StepDefinitionRequest step, List<string> errors)
    {
        if (step.DurationSeconds is null or < StepEntryKinds.GapSecondsMin or > StepEntryKinds.GapSecondsMax)
        {
            errors.Add(
                $"Gap {step.Order}: durationSeconds must be between {StepEntryKinds.GapSecondsMin} and {StepEntryKinds.GapSecondsMax}.");
        }

        if (step.Message?.Trim().Length > StepEntryKinds.GapMessageMaxLength)
        {
            errors.Add(
                $"Gap {step.Order}: message must be {StepEntryKinds.GapMessageMaxLength} characters or fewer.");
        }
    }

    private static void ValidateCard(
        StepDefinitionRequest step,
        double? videoDurationSeconds,
        bool useVideoContent,
        List<string> errors)
    {
        if (step.DurationSeconds is null or < StepEntryKinds.CardSecondsMin or > StepEntryKinds.CardSecondsMax)
        {
            errors.Add(
                $"Card {step.Order}: durationSeconds must be between {StepEntryKinds.CardSecondsMin} and {StepEntryKinds.CardSecondsMax}.");
        }

        if (step.Message?.Trim().Length > StepEntryKinds.GapMessageMaxLength)
        {
            errors.Add(
                $"Card {step.Order}: message must be {StepEntryKinds.GapMessageMaxLength} characters or fewer.");
        }

        if (!string.IsNullOrWhiteSpace(step.BackgroundColor) && !StepEntryKinds.IsHexColour(step.BackgroundColor))
        {
            errors.Add($"Card {step.Order}: backgroundColor must be a hex colour such as #02C998.");
        }

        if (!string.IsNullOrWhiteSpace(step.TextColor) && !StepEntryKinds.IsHexColour(step.TextColor))
        {
            errors.Add($"Card {step.Order}: textColor must be a hex colour such as #002116.");
        }

        if (step.StillSeconds is { } still)
        {
            if (!useVideoContent)
            {
                errors.Add($"Card {step.Order}: a still needs a TikTok. Turn video content on, or use a colour card.");
            }
            else if (still < 0)
            {
                errors.Add($"Card {step.Order}: stillSeconds must be >= 0.");
            }
            else if (videoDurationSeconds is > 0 && still > videoDurationSeconds)
            {
                errors.Add($"Card {step.Order}: stillSeconds must be <= video duration.");
            }
        }
    }

    private static void ValidateActivity(
        StepDefinitionRequest step,
        double? videoDurationSeconds,
        List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(step.Title))
        {
            errors.Add($"Step {step.Order}: title must not be blank.");
        }

        if (step.StartSeconds < 0)
        {
            errors.Add($"Step {step.Order}: startSeconds must be >= 0.");
        }

        if (step.EndSeconds <= step.StartSeconds)
        {
            errors.Add($"Step {step.Order}: endSeconds must be greater than startSeconds.");
        }

        if (step.DurationSeconds is <= 0)
        {
            errors.Add($"Step {step.Order}: durationSeconds must be null or > 0.");
        }

        if (videoDurationSeconds is > 0 && step.EndSeconds > videoDurationSeconds)
        {
            errors.Add($"Step {step.Order}: endSeconds must be <= video duration.");
        }
    }
}
