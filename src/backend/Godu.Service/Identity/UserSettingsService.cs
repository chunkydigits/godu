using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.Users;

namespace Godu.Service.Identity;

public sealed class UserSettingsService : IUserSettingsService
{
    private readonly IUserRepository _users;
    private readonly ICurrentUser _currentUser;

    public UserSettingsService(IUserRepository users, ICurrentUser currentUser)
    {
        _users = users;
        _currentUser = currentUser;
    }

    public async Task<UserSettingsResponse> GetMineAsync(CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(cancellationToken).ConfigureAwait(false);
        return ToResponse(user.UseVoiceCuesByDefault);
    }

    public async Task<UserSettingsResponse> UpdateMineAsync(
        UpdateUserSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(cancellationToken).ConfigureAwait(false);
        user.UseVoiceCuesByDefault = request.UseVoiceCuesByDefault;
        user.UpdatedUtc = DateTime.UtcNow;
        var saved = await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
        return ToResponse(saved.UseVoiceCuesByDefault);
    }

    private async Task<UserDocument> GetCurrentUserAsync(
        CancellationToken cancellationToken)
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

        return user;
    }

    private static UserSettingsResponse ToResponse(bool useVoiceCuesByDefault) =>
        new() { UseVoiceCuesByDefault = useVoiceCuesByDefault };
}
