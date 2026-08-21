using Godu.Service.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public sealed class MeController : ControllerBase
{
    private readonly IMeService _me;
    private readonly ILogger<MeController> _logger;

    public MeController(IMeService me, ILogger<MeController> logger)
    {
        _me = me;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _me.GetMineAsync(cancellationToken));
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
            _logger.LogError(ex, "Failed to load current user.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
