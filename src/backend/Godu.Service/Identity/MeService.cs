using Godu.Model.Configuration;
using Godu.Model.Responses;
using Godu.Repository.Users;
using Godu.Service.Creators;
using Godu.Service.Mapping;
using Microsoft.Extensions.Options;

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
    private readonly ICreatorEntitlementService _entitlement;
    private readonly CreatorMonetisationOptions _monetisation;

    public MeService(
        ICurrentUser currentUser,
        IUserRepository users,
        IAdminAccessService admin,
        ICreatorEntitlementService entitlement,
        IOptions<CreatorMonetisationOptions> monetisation)
    {
        _currentUser = currentUser;
        _users = users;
        _admin = admin;
        _entitlement = entitlement;
        _monetisation = monetisation.Value;
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
        var entitlement = _entitlement.Evaluate(user);
        return new MeResponse
        {
            UserId = user.Id,
            DisplayName = user.DisplayName,
            IsAdmin = isAdmin,
            IsInternal = _admin.IsEffectiveInternal(user),
            CanPublishPublic = entitlement.CanPublishPublic,
            MonthlyPriceGbp = _monetisation.MonthlyPriceGbp,
            Entitlement = CreatorEntitlementMapper.ToResponse(entitlement),
        };
    }
}
