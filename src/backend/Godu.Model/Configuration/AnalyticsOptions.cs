namespace Godu.Model.Configuration;

public sealed class AnalyticsOptions
{
    public const string SectionName = "Analytics";

    /// <summary>Development, Staging, or Production. Empty uses the host environment name.</summary>
    public string Environment { get; set; } = string.Empty;

    public string[] InternalUserIds { get; set; } = [];

    public string[] AdminUserIds { get; set; } = [];

    /// <summary>When true, any authenticated user can load the summary (local Development only).</summary>
    public bool AllowAnyAuthenticatedAdmin { get; set; }

    public bool IsInternalUser(string? userId) =>
        !string.IsNullOrWhiteSpace(userId)
        && InternalUserIds.Contains(userId, StringComparer.Ordinal);

    public bool IsAdminUser(string? userId) =>
        !string.IsNullOrWhiteSpace(userId)
        && AdminUserIds.Contains(userId, StringComparer.Ordinal);
}
