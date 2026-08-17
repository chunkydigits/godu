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
}
