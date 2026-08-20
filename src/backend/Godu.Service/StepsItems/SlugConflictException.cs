namespace Godu.Service.StepsItems;

public sealed class SlugConflictException : Exception
{
    public SlugConflictException()
        : base("That public URL is already in use for this creator account.")
    {
    }
}
