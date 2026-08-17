namespace Godu.Model.Documents;

public sealed class LinkedPlatformAccountDocument
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string Provider { get; set; }

    public required string ExternalAccountId { get; set; }

    public required string Username { get; set; }

    public string? DisplayName { get; set; }

    public string? ProfileUrl { get; set; }

    public string? AvatarUrl { get; set; }

    public List<string> UsernameAliases { get; set; } = [];

    public bool IsVerified { get; set; }

    public DateTime? VerifiedUtc { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }

    public string? EncryptedAccessToken { get; set; }

    public string? EncryptedRefreshToken { get; set; }

    public DateTime? AccessTokenExpiresUtc { get; set; }

    public DateTime? RefreshTokenExpiresUtc { get; set; }

    public string? Scope { get; set; }
}
