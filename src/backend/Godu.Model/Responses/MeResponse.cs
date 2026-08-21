namespace Godu.Model.Responses;

public sealed class MeResponse
{
    public required string UserId { get; init; }

    public required string DisplayName { get; init; }

    public bool IsAdmin { get; init; }

    public bool IsInternal { get; init; }
}
