using Godu.Model.Responses;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.Users;
using Godu.Service.Mapping;

namespace Godu.Service.Creators;

public sealed class CreatorProfileService : ICreatorProfileService
{
    private readonly IUserRepository _users;
    private readonly ILinkedPlatformAccountRepository _accounts;

    public CreatorProfileService(IUserRepository users, ILinkedPlatformAccountRepository accounts)
    {
        _users = users;
        _accounts = accounts;
    }

    public async Task<CreatorProfileResponse> GetPublicAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var accounts = await _accounts.ListByUserAsync(userId, cancellationToken).ConfigureAwait(false);
        var socials = CreatorSocialMapper.Combine(accounts);
        if (socials.Count == 0)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var displayName = !string.IsNullOrWhiteSpace(user?.DisplayName)
            ? user.DisplayName
            : $"@{socials[0].Username}";

        return new CreatorProfileResponse
        {
            UserId = userId,
            DisplayName = displayName,
            Socials = socials,
        };
    }
}
