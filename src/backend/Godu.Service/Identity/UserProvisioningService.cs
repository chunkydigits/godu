using Godu.Model.Documents;
using Godu.Repository.ExternalIdentities;
using Godu.Repository.Users;
using Godu.Utility;

namespace Godu.Service.Identity;

public sealed class UserProvisioningService : IUserProvisioningService
{
    private readonly IExternalIdentityRepository _externalIdentities;
    private readonly IUserRepository _users;

    public UserProvisioningService(
        IExternalIdentityRepository externalIdentities,
        IUserRepository users)
    {
        _externalIdentities = externalIdentities;
        _users = users;
    }

    public async Task<string> EnsureUserAsync(
        string identityProvider,
        string externalSubjectId,
        string? displayNameHint,
        CancellationToken cancellationToken = default)
    {
        var existing = await _externalIdentities
            .GetByProviderSubjectAsync(identityProvider, externalSubjectId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            return existing.UserId;
        }

        var now = DateTime.UtcNow;
        var userId = IdGenerator.NewUserId();
        var displayName = string.IsNullOrWhiteSpace(displayNameHint) ? "Godu user" : displayNameHint.Trim();

        await _users
            .CreateAsync(
                new UserDocument
                {
                    Id = userId,
                    DisplayName = displayName,
                    CreatedUtc = now,
                    UpdatedUtc = now,
                },
                cancellationToken)
            .ConfigureAwait(false);

        await _externalIdentities
            .CreateAsync(
                new ExternalIdentityDocument
                {
                    Id = IdGenerator.NewExternalIdentityId(),
                    UserId = userId,
                    IdentityProvider = identityProvider,
                    ExternalSubjectId = externalSubjectId,
                    CreatedUtc = now,
                },
                cancellationToken)
            .ConfigureAwait(false);

        return userId;
    }
}
