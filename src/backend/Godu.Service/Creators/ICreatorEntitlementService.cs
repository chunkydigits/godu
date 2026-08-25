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
        CancellationToken cancellationToken = default);
}
