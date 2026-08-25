using Godu.Model.Creators;
using Godu.Model.Documents;

namespace Godu.Service.Creators;

public interface ICreatorEntitlementService
{
    CreatorEntitlement Evaluate(UserDocument user, DateTime? utcNow = null);

    Task<CreatorEntitlement> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    Task StartTrialIfNeededAsync(
        string userId,
        DateTime publishedUtc,
        string? goduId = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasPublicEntitlementAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> CanPublishPublicAsync(string userId, CancellationToken cancellationToken = default);
}
