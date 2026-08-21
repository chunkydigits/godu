namespace Godu.Model.Responses;

public sealed class AdminUserResponse
{
    public required string Id { get; init; }

    public required string DisplayName { get; init; }

    public DateTime CreatedUtc { get; init; }

    public bool IsAdmin { get; init; }

    public bool AdminFromConfig { get; init; }

    public bool IsInternal { get; init; }

    public bool InternalFromConfig { get; init; }
}
