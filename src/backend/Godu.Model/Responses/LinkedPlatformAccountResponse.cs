namespace Godu.Model.Responses;

public sealed class LinkedPlatformAccountResponse
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string Provider { get; init; }

    public required string ExternalAccountId { get; init; }

    public required string Username { get; init; }

    public string? DisplayName { get; init; }

    public string? ProfileUrl { get; init; }

    public string? AvatarUrl { get; init; }

    public required bool IsVerified { get; init; }

    public DateTime? VerifiedUtc { get; init; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; init; }
}
