using Godu.Model.Responses;
using Godu.Repository.Users;

namespace Godu.Service.Identity;

public interface IMeService
{
    Task<MeResponse> GetMineAsync(CancellationToken cancellationToken = default);
}

public sealed class MeService : IMeService
{
    private readonly ICurrentUser _currentUser;
    private readonly IUserRepository _users;
    private readonly IAdminAccessService _admin;

    public MeService(ICurrentUser currentUser, IUserRepository users, IAdminAccessService admin)
    {
        _currentUser = currentUser;
        _users = users;
        _admin = admin;
    }

    public async Task<MeResponse> GetMineAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        var user = await _users.GetByIdAsync(_currentUser.UserId, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var isAdmin = await _admin.IsCurrentUserAdminAsync(cancellationToken).ConfigureAwait(false);
        return new MeResponse
        {
            UserId = user.Id,
            DisplayName = user.DisplayName,
            IsAdmin = isAdmin,
            IsInternal = _admin.IsEffectiveInternal(user),
        };
    }
}
