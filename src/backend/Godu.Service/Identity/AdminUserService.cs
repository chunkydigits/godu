using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.Users;

namespace Godu.Service.Identity;

public sealed class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _users;
    private readonly IAdminAccessService _admin;

    public AdminUserService(IUserRepository users, IAdminAccessService admin)
    {
        _users = users;
        _admin = admin;
    }

    public async Task<IReadOnlyList<AdminUserResponse>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        await _admin.RequireAdminAsync(cancellationToken).ConfigureAwait(false);
        var users = await _users.ListAsync(cancellationToken).ConfigureAwait(false);
        return users.Select(ToResponse).ToList();
    }

    public async Task<AdminUserResponse> UpdateAsync(
        string userId,
        UpdateAdminUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await _admin.RequireAdminAsync(cancellationToken).ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User id is required.");
        }

        var user = await _users.GetByIdAsync(userId.Trim(), cancellationToken).ConfigureAwait(false)
            ?? throw new KeyNotFoundException("User not found.");

        if (request.IsAdmin is bool isAdmin && isAdmin != user.IsAdmin)
        {
            if (!isAdmin && !_admin.IsConfiguredAdmin(user.Id))
            {
                await EnsureAnotherAdminAsync(user.Id, cancellationToken).ConfigureAwait(false);
            }

            user.IsAdmin = isAdmin;
        }

        if (request.IsInternal is bool isInternal)
        {
            user.IsInternal = isInternal;
        }

        user.UpdatedUtc = DateTime.UtcNow;
        var saved = await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
        return ToResponse(saved);
    }

    private async Task EnsureAnotherAdminAsync(string userId, CancellationToken cancellationToken)
    {
        var users = await _users.ListAsync(cancellationToken).ConfigureAwait(false);
        var remaining = users.Count(item => item.Id != userId && _admin.IsEffectiveAdmin(item));
        if (remaining == 0)
        {
            throw new InvalidOperationException("At least one admin is required.");
        }
    }

    private AdminUserResponse ToResponse(UserDocument user) =>
        new()
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            CreatedUtc = user.CreatedUtc,
            IsAdmin = _admin.IsEffectiveAdmin(user),
            AdminFromConfig = _admin.IsConfiguredAdmin(user.Id),
            IsInternal = _admin.IsEffectiveInternal(user),
            InternalFromConfig = _admin.IsConfiguredInternal(user.Id),
        };
}
