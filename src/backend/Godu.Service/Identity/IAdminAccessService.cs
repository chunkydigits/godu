using Godu.Model.Documents;

namespace Godu.Service.Identity;

public interface IAdminAccessService
{
    Task RequireAdminAsync(CancellationToken cancellationToken = default);

    Task<bool> IsCurrentUserAdminAsync(CancellationToken cancellationToken = default);

    bool IsEffectiveAdmin(UserDocument user);

    bool IsEffectiveInternal(UserDocument user);

    bool IsConfiguredAdmin(string userId);

    bool IsConfiguredInternal(string userId);
}
