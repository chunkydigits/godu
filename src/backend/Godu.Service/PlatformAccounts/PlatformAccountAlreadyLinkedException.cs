namespace Godu.Service.PlatformAccounts;

public sealed class PlatformAccountAlreadyLinkedException : InvalidOperationException
{
    public PlatformAccountAlreadyLinkedException()
        : base("This platform account is already linked to another Godu user.")
    {
    }
}
