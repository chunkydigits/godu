namespace Godu.Model.Responses;

public sealed class CreatorSocialResponse
{
    public required string Provider { get; init; }

    public required string Username { get; init; }

    public required string ProfileUrl { get; init; }

    public string? DisplayName { get; init; }
}
