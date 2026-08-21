using Godu.Model.Requests;
using Godu.Service.PlayHistory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me/play-history")]
public sealed class MePlayHistoryController : ControllerBase
{
    private readonly IPlayHistoryService _history;
    private readonly ILogger<MePlayHistoryController> _logger;

    public MePlayHistoryController(IPlayHistoryService history, ILogger<MePlayHistoryController> logger)
    {
        _history = history;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(
        [FromQuery] int take = PlayHistoryService.DefaultTake,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _history.ListMineAsync(take, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list play history.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    public async Task<IActionResult> RecordAsync(
        [FromBody] RecordPlayHistoryRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            return Ok(await _history.RecordAsync(request, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record play history.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
