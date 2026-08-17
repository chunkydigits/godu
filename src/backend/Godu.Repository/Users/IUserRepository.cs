using Godu.Model.Documents;

namespace Godu.Repository.Users;

public interface IUserRepository
{
    Task<UserDocument?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    Task<UserDocument> CreateAsync(UserDocument user, CancellationToken cancellationToken = default);
}
