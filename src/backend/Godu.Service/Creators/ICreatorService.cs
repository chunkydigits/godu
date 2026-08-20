using Godu.Model.Documents;

namespace Godu.Service.Creators;

public interface ICreatorService
{
    Task<CreatorDocument> EnsureForUserAsync(
        string userId,
        string displayName,
        string? profileImageUrl,
        string? bio = null,
        CancellationToken cancellationToken = default);

    Task<CreatorDocument> UpdateForUserAsync(
        string userId,
        string displayName,
        string? bio,
        string? profileImageUrl,
        CancellationToken cancellationToken = default);
}
