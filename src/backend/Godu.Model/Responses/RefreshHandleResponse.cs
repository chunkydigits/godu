namespace Godu.Model.Responses;

public sealed class RefreshHandleResponse
{
    public required LinkedPlatformAccountResponse Account { get; init; }

    public required bool HandleChanged { get; init; }

    public string? PreviousUsername { get; init; }

    public int UpdatedStepsCount { get; init; }
}
