using Godu.Model.Documents;

namespace Godu.Repository.Creators;

public interface ICreatorRepository
{
    Task<CreatorDocument?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    Task<CreatorDocument> CreateAsync(CreatorDocument creator, CancellationToken cancellationToken = default);

    Task<CreatorDocument> UpdateAsync(CreatorDocument creator, CancellationToken cancellationToken = default);
}
