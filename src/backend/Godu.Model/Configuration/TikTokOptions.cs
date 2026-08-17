namespace Godu.Model.Configuration;

public sealed class TikTokOptions
{
    public const string SectionName = "TikTok";

    public string ClientKey { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>Registered TikTok redirect — the API OAuth callback.</summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>SPA path the API redirects to after connect succeeds or fails.</summary>
    public string FrontendReturnUrl { get; set; } = string.Empty;

    public string Scopes { get; set; } = "user.info.basic,user.info.profile,video.list";

    public string AuthorizeUrl { get; set; } = "https://www.tiktok.com/v2/auth/authorize/";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientKey)
        && !string.IsNullOrWhiteSpace(ClientSecret)
        && !string.IsNullOrWhiteSpace(RedirectUri)
        && !string.IsNullOrWhiteSpace(FrontendReturnUrl);
}
