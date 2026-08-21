namespace Godu.Model.Analytics;

public static class AnalyticsEventNames
{
    public const string PageViewed = "page_viewed";
    public const string LandingPageViewed = "landing_page_viewed";
    public const string CreateStarted = "create_started";
    public const string VideoUrlSubmitted = "video_url_submitted";
    public const string VideoLoaded = "video_loaded";
    public const string VideoLoadFailed = "video_load_failed";
    public const string StepAdded = "step_added";
    public const string StepDeleted = "step_deleted";
    public const string GoduSaved = "godu_saved";
    public const string GoduPublished = "godu_published";
    public const string GoduViewed = "godu_viewed";
    public const string GoduStarted = "godu_started";
    public const string StepStarted = "step_started";
    public const string StepCompleted = "step_completed";
    public const string NextStepClicked = "next_step_clicked";
    public const string PreviousStepClicked = "previous_step_clicked";
    public const string StepRepeated = "step_repeated";
    public const string GoduCompleted = "godu_completed";
    public const string ShareClicked = "share_clicked";
    public const string LinkCopied = "link_copied";
    public const string RegistrationStarted = "registration_started";
    public const string LoginCompleted = "login_completed";
    public const string Logout = "logout";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        PageViewed,
        LandingPageViewed,
        CreateStarted,
        VideoUrlSubmitted,
        VideoLoaded,
        VideoLoadFailed,
        StepAdded,
        StepDeleted,
        GoduSaved,
        GoduPublished,
        GoduViewed,
        GoduStarted,
        StepStarted,
        StepCompleted,
        NextStepClicked,
        PreviousStepClicked,
        StepRepeated,
        GoduCompleted,
        ShareClicked,
        LinkCopied,
        RegistrationStarted,
        LoginCompleted,
        Logout,
    };

    public static bool IsKnown(string? eventName) =>
        !string.IsNullOrWhiteSpace(eventName) && All.Contains(eventName.Trim());
}
