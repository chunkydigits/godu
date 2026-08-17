using Godu.Service.PlatformAccounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me/platform-accounts")]
public sealed class MePlatformAccountsController : ControllerBase
{
    private readonly ILinkedPlatformAccountService _platformAccounts;
    private readonly ILogger<MePlatformAccountsController> _logger;

    public MePlatformAccountsController(
        ILinkedPlatformAccountService platformAccounts,
        ILogger<MePlatformAccountsController> logger)
    {
        _platformAccounts = platformAccounts;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var accounts = await _platformAccounts.ListMineAsync(cancellationToken);
            return Ok(accounts);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list platform accounts.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>Starts TikTok Login Kit OAuth. Returns the authorization URL to open.</summary>
    [HttpPost("{provider}/connect")]
    public async Task<IActionResult> ConnectAsync(
        string provider,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var started = await _platformAccounts.StartConnectAsync(provider, cancellationToken);
            return Ok(started);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start platform connect for {Provider}.", provider);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>TikTok OAuth redirect target. Completes the link using one-time state, then returns to the SPA.</summary>
    [AllowAnonymous]
    [HttpGet("{provider}/callback")]
    public async Task<IActionResult> CallbackAsync(
        string provider,
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken cancellationToken = default)
    {
        var returnUrl = await _platformAccounts.CompleteConnectFromCallbackAsync(
            provider,
            code,
            state,
            error,
            cancellationToken);
        return Redirect(returnUrl);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DisconnectAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            await _platformAccounts.DisconnectAsync(id, cancellationToken);
            return Ok();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to disconnect platform account {Id}.", id);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
