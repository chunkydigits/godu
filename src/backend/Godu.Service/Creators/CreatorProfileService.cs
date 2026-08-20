using Godu.Model.Responses;
using Godu.Repository.Creators;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;
using Godu.Service.Mapping;
using Godu.Utility;

namespace Godu.Service.Creators;

public sealed class CreatorProfileService : ICreatorProfileService
{
    private readonly IUserRepository _users;
    private readonly ILinkedPlatformAccountRepository _accounts;
    private readonly ICreatorRepository _creators;
    private readonly IStepsItemRepository _steps;

    public CreatorProfileService(
        IUserRepository users,
        ILinkedPlatformAccountRepository accounts,
        ICreatorRepository creators,
        IStepsItemRepository steps)
    {
        _users = users;
        _accounts = accounts;
        _creators = creators;
        _steps = steps;
    }

    public async Task<CreatorProfileResponse> GetPublicAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        return await BuildProfileAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<CreatorProfileResponse> GetPublicByHandleAsync(
        string providerAlias,
        string username,
        CancellationToken cancellationToken = default)
    {
        if (!ProviderUtilities.TryCanonicalise(providerAlias, out var provider))
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var handle = username.Trim().TrimStart('@');
        var account = await _accounts
            .GetVerifiedByProviderAndUsernameAsync(provider, handle, cancellationToken)
            .ConfigureAwait(false);
        if (account is null)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        return await BuildProfileAsync(account.UserId, cancellationToken).ConfigureAwait(false);
    }

    private async Task<CreatorProfileResponse> BuildProfileAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var creator = await _creators.GetByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var accounts = await _accounts.ListByUserAsync(userId, cancellationToken).ConfigureAwait(false);
        var socials = CreatorSocialMapper.Combine(accounts);
        if (socials.Count == 0)
        {
            throw new KeyNotFoundException("Creator not found.");
        }

        var displayName = FirstNonEmpty(
            creator?.DisplayName,
            user?.DisplayName,
            $"@{socials[0].Username}");

        var published = await _steps
            .ListPublicByUserAsync(userId, cancellationToken)
            .ConfigureAwait(false);

        return new CreatorProfileResponse
        {
            UserId = userId,
            DisplayName = displayName!,
            Socials = socials,
            PublishedSteps = published.Select(StepsItemMapper.ToPublicSummary).ToList(),
        };
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
