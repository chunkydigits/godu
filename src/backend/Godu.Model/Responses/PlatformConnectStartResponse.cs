namespace Godu.Model.Responses;

public sealed class PlatformConnectStartResponse
{
    public required string Provider { get; init; }

    public required string AuthorizationUrl { get; init; }
}
