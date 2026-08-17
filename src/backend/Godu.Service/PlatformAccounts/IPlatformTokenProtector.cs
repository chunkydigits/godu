namespace Godu.Service.PlatformAccounts;

public interface IPlatformTokenProtector
{
    string Protect(string plaintext);

    string Unprotect(string protectedValue);
}
