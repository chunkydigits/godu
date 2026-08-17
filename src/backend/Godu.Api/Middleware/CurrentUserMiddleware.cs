using System.Security.Claims;
using Godu.Service.Identity;

namespace Godu.Api.Middleware;

public sealed class CurrentUserMiddleware
{
    private readonly RequestDelegate _next;

    public CurrentUserMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ICurrentUser currentUser,
        IUserProvisioningService provisioning)
    {
        if (context.User.Identity?.IsAuthenticated == true && currentUser is CurrentUser mutable)
        {
            var subject = context.User.FindFirstValue("sub")
                ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrWhiteSpace(subject))
            {
                var displayName = context.User.FindFirstValue("name")
                    ?? context.User.FindFirstValue("nickname")
                    ?? context.User.FindFirstValue(ClaimTypes.Name);

                var userId = await provisioning.EnsureUserAsync(
                    "auth0",
                    subject,
                    displayName,
                    context.RequestAborted);

                mutable.IsAuthenticated = true;
                mutable.UserId = userId;
            }
        }

        await _next(context);
    }
}
