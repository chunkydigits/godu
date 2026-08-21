using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Repository.Users;
using Microsoft.Extensions.Options;

namespace Godu.Service.Identity;

public sealed class AdminAccessService : IAdminAccessService
{
    private readonly ICurrentUser _currentUser;
    private readonly IUserRepository _users;
    private readonly AnalyticsOptions _options;

    public AdminAccessService(
        ICurrentUser currentUser,
        IUserRepository users,
        IOptions<AnalyticsOptions> options)
    {
        _currentUser = currentUser;
        _users = users;
        _options = options.Value;
    }

    public async Task RequireAdminAsync(CancellationToken cancellationToken = default)
    {
        if (!await IsCurrentUserAdminAsync(cancellationToken).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException(
                _currentUser.IsAuthenticated ? "Admin access required." : "Authentication required.");
        }
    }

    public async Task<bool> IsCurrentUserAdminAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            return false;
        }

        if (_options.AllowAnyAuthenticatedAdmin || _options.IsAdminUser(_currentUser.UserId))
        {
            return true;
        }

        var user = await _users.GetByIdAsync(_currentUser.UserId, cancellationToken).ConfigureAwait(false);
        return user?.IsAdmin == true;
    }

    public bool IsEffectiveAdmin(UserDocument user) =>
        user.IsAdmin || _options.IsAdminUser(user.Id) || _options.AllowAnyAuthenticatedAdmin;

    public bool IsEffectiveInternal(UserDocument user) =>
        user.IsInternal || _options.IsInternalUser(user.Id);

    public bool IsConfiguredAdmin(string userId) => _options.IsAdminUser(userId);

    public bool IsConfiguredInternal(string userId) => _options.IsInternalUser(userId);
}
