using Godu.Model.Requests;
using Godu.Service.SavedGodus;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me/saved-godus")]
public sealed class MeSavedGodusController : ControllerBase
{
    private readonly ISavedGoduService _saved;
    private readonly ILogger<MeSavedGodusController> _logger;

    public MeSavedGodusController(ISavedGoduService saved, ILogger<MeSavedGodusController> logger)
    {
        _saved = saved;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(
        [FromQuery] int take = SavedGoduService.DefaultTake,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _saved.ListMineAsync(take, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list saved Godus.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    public async Task<IActionResult> SaveAsync(
        [FromBody] SaveGoduRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            return Ok(await _saved.SaveAsync(request, cancellationToken));
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
            _logger.LogError(ex, "Failed to save Godu.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpDelete("{goduId}")]
    public async Task<IActionResult> RemoveAsync(string goduId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _saved.RemoveAsync(goduId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove saved Godu {GoduId}.", goduId);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPut("{goduId}/settings")]
    public async Task<IActionResult> UpdateSettingsAsync(
        string goduId,
        [FromBody] UpdateSavedGoduSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _saved.UpdateSettingsAsync(goduId, request, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
    }
}
