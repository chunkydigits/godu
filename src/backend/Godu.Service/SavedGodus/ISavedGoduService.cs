using Godu.Model.Requests;
using Godu.Model.Responses;

namespace Godu.Service.SavedGodus;

public interface ISavedGoduService
{
    Task<SavedGoduResponse> SaveAsync(
        SaveGoduRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SavedGoduResponse>> ListMineAsync(
        int take = 50,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(string goduId, CancellationToken cancellationToken = default);
}
