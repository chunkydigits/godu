namespace Godu.Service.TikTok;

public sealed class TikTokUserInfo
{
    public required string OpenId { get; init; }

    public string? Username { get; init; }

    public string? DisplayName { get; init; }

    public string? AvatarUrl { get; init; }

    public string? Bio { get; init; }
}
