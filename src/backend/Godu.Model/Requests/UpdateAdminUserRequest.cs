namespace Godu.Model.Requests;

public sealed class UpdateAdminUserRequest
{
    public bool? IsAdmin { get; init; }

    public bool? IsInternal { get; init; }
}
