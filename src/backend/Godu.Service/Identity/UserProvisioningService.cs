using Godu.Model.Documents;
using Godu.Repository.ExternalIdentities;
using Godu.Repository.Users;
using Godu.Service.Mapping;
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
        string? emailHint = null,
        CancellationToken cancellationToken = default)
    {
        var existing = await _externalIdentities
            .GetByProviderSubjectAsync(identityProvider, externalSubjectId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            await TryStoreEmailAsync(existing.UserId, emailHint, cancellationToken).ConfigureAwait(false);
            return existing.UserId;
        }

        var now = DateTime.UtcNow;
        var userId = IdGenerator.NewUserId();
        var displayName = string.IsNullOrWhiteSpace(displayNameHint) ? "Godu user" : displayNameHint.Trim();
        var email = NormaliseEmail(emailHint);

        await _users
            .CreateAsync(
                new UserDocument
                {
                    Id = userId,
                    DisplayName = displayName,
                    Email = email,
                    CreatorSubscriptionStatus = CreatorSubscriptionMapper.NotStarted,
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

    private async Task TryStoreEmailAsync(
        string userId,
        string? emailHint,
        CancellationToken cancellationToken)
    {
        var email = NormaliseEmail(emailHint);
        if (email is null)
        {
            return;
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            return;
        }

        if (string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        user.Email = email;
        user.UpdatedUtc = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
    }

    private static string? NormaliseEmail(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
