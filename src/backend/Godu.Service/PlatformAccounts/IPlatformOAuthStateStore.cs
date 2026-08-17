namespace Godu.Service.PlatformAccounts;

public interface IPlatformOAuthStateStore
{
    string Create(string userId);

    bool TryConsume(string state, out string userId);
}
