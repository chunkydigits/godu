namespace Godu.Service.Identity;

public interface IUserProvisioningService
{
    Task<string> EnsureUserAsync(
        string identityProvider,
        string externalSubjectId,
        string? displayNameHint,
        string? emailHint = null,
        CancellationToken cancellationToken = default);
}
