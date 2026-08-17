namespace Godu.Service.Identity;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    string? UserId { get; }
}
