using Godu.Model.Requests;
using Godu.Model.Responses;

namespace Godu.Service.Identity;

public interface IAdminUserService
{
    Task<IReadOnlyList<AdminUserResponse>> ListAsync(CancellationToken cancellationToken = default);

    Task<AdminUserResponse> UpdateAsync(
        string userId,
        UpdateAdminUserRequest request,
        CancellationToken cancellationToken = default);
}
