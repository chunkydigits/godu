namespace Godu.Service.TikTok;

public interface ITikTokOAuthClient
{
    Task<TikTokTokenResult> ExchangeCodeAsync(
        string code,
        string redirectUri,
        CancellationToken cancellationToken = default);

    Task<TikTokUserInfo> GetUserInfoAsync(
        string accessToken,
        CancellationToken cancellationToken = default);

    Task RevokeAsync(string accessToken, CancellationToken cancellationToken = default);

    Task<TikTokTokenResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// True when TikTok's video.query returns the id for this access token (the user owns it).
    /// </summary>
    Task<bool> UserOwnsVideoAsync(
        string accessToken,
        string externalVideoId,
        CancellationToken cancellationToken = default);
}
