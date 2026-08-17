using Microsoft.AspNetCore.DataProtection;

namespace Godu.Service.PlatformAccounts;

public sealed class DataProtectionPlatformTokenProtector : IPlatformTokenProtector
{
    private readonly IDataProtector _protector;

    public DataProtectionPlatformTokenProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("Godu.LinkedPlatformAccount.Tokens");
    }

    public string Protect(string plaintext) => _protector.Protect(plaintext);

    public string Unprotect(string protectedValue) => _protector.Unprotect(protectedValue);
}
