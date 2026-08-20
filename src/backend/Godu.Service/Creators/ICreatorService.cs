using Godu.Model.Documents;

namespace Godu.Service.Creators;

public interface ICreatorService
{
    Task<CreatorDocument> EnsureForUserAsync(
        string userId,
        string displayName,
        string? profileImageUrl,
        CancellationToken cancellationToken = default);
}
