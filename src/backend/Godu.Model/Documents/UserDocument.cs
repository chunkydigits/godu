namespace Godu.Model.Documents;

public sealed class UserDocument
{
    public required string Id { get; init; }

    public required string DisplayName { get; set; }

    /// <summary>When true, Steps playback starts with spoken cues and muted clip audio.</summary>
    public bool UseVoiceCuesByDefault { get; set; }

    public bool IsAdmin { get; set; }

    /// <summary>When true, this user's analytics events are flagged internal and excluded from reports.</summary>
    public bool IsInternal { get; set; }

    /// <summary>
    /// Stored commercial status. Effective status is derived at read time from dates
    /// (a stored Trial whose end has passed is Expired).
    /// </summary>
    public string? CreatorSubscriptionStatus { get; set; }

    public DateTime? TrialStartedAt { get; set; }

    public DateTime? TrialEndsAt { get; set; }

    public DateTime? SubscriptionStartedAt { get; set; }

    public DateTime? SubscriptionEndsAt { get; set; }

    public DateTime? TrialWarningEmailSentAt { get; set; }

    public DateTime? TrialEndedEmailSentAt { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }
}
