using Godu.Model.Requests;
using Godu.Service.Creators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/creator/profile")]
public sealed class CreatorProfileController : ControllerBase
{
    private readonly ICreatorProfileService _creators;
    private readonly ILogger<CreatorProfileController> _logger;

    public CreatorProfileController(ICreatorProfileService creators, ILogger<CreatorProfileController> logger)
    {
        _creators = creators;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _creators.GetMineAsync(cancellationToken));
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
            _logger.LogError(ex, "Failed to load creator profile.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPatch]
    public async Task<IActionResult> UpdateAsync(
        [FromBody] UpdateCreatorProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            return Ok(await _creators.UpdateMineAsync(request, cancellationToken));
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
            _logger.LogError(ex, "Failed to update creator profile.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost("from-social")]
    public async Task<IActionResult> ImportAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _creators.ImportMineFromSocialAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import creator profile from social.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
