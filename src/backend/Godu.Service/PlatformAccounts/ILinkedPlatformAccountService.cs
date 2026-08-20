using Godu.Model.Responses;

namespace Godu.Service.PlatformAccounts;

public interface ILinkedPlatformAccountService
{
    Task<IReadOnlyList<LinkedPlatformAccountResponse>> ListMineAsync(
        CancellationToken cancellationToken = default);

    Task<PlatformConnectStartResponse> StartConnectAsync(
        string provider,
        CancellationToken cancellationToken = default);

    Task<string> CompleteConnectFromCallbackAsync(
        string provider,
        string? code,
        string? state,
        string? error,
        CancellationToken cancellationToken = default);

    Task DisconnectAsync(string id, CancellationToken cancellationToken = default);

    Task<LinkedPlatformAccountResponse> RefreshVerifiedMetadataAsync(
        CancellationToken cancellationToken = default);
}
