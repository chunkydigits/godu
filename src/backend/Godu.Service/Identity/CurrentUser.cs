namespace Godu.Service.Identity;

public sealed class CurrentUser : ICurrentUser
{
    public bool IsAuthenticated { get; set; }

    public string? UserId { get; set; }
}
