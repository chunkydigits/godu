using Godu.Model.Documents;

namespace Godu.Repository.LinkedPlatformAccounts;

public interface ILinkedPlatformAccountRepository
{
    Task<LinkedPlatformAccountDocument?> GetByIdAsync(
        string id,
        string userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LinkedPlatformAccountDocument>> ListByUserAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<LinkedPlatformAccountDocument?> GetByProviderAndExternalIdAsync(
        string provider,
        string externalAccountId,
        CancellationToken cancellationToken = default);

    Task<LinkedPlatformAccountDocument> CreateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default);

    Task<LinkedPlatformAccountDocument> UpdateAsync(
        LinkedPlatformAccountDocument account,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(string id, string userId, CancellationToken cancellationToken = default);
}
