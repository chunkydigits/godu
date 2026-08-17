using Godu.Model.Requests;

namespace Godu.Service.Validation;

public static class StepDefinitionValidator
{
    public static IReadOnlyList<string> Validate(IEnumerable<StepDefinitionRequest> steps, double? videoDurationSeconds = null)
    {
        var errors = new List<string>();

        foreach (var step in steps)
        {
            if (step.Order < 1)
            {
                errors.Add($"Step order must be >= 1 (got {step.Order}).");
            }

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

        return errors;
    }
}
