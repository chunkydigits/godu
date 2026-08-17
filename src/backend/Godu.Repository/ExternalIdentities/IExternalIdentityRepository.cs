using Godu.Model.Documents;

namespace Godu.Repository.ExternalIdentities;

public interface IExternalIdentityRepository
{
    Task<ExternalIdentityDocument?> GetByProviderSubjectAsync(
        string identityProvider,
        string externalSubjectId,
        CancellationToken cancellationToken = default);

    Task<ExternalIdentityDocument> CreateAsync(
        ExternalIdentityDocument identity,
        CancellationToken cancellationToken = default);
}
