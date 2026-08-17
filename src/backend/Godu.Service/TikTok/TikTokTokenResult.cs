namespace Godu.Service.TikTok;

public sealed class TikTokTokenResult
{
    public required string AccessToken { get; init; }

    public required string OpenId { get; init; }

    public string? RefreshToken { get; init; }

    public int ExpiresInSeconds { get; init; }

    public int RefreshExpiresInSeconds { get; init; }

    public string? Scope { get; init; }
}
