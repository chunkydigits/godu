using Godu.Model.Requests;
using Godu.Model.Responses;

namespace Godu.Service.Identity;

public interface IUserSettingsService
{
    Task<UserSettingsResponse> GetMineAsync(CancellationToken cancellationToken = default);

    Task<UserSettingsResponse> UpdateMineAsync(
        UpdateUserSettingsRequest request,
        CancellationToken cancellationToken = default);
}
