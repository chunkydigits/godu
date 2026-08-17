namespace Godu.Service.Identity;

public interface IUserProvisioningService
{
    Task<string> EnsureUserAsync(
        string identityProvider,
        string externalSubjectId,
        string? displayNameHint,
        CancellationToken cancellationToken = default);
}
