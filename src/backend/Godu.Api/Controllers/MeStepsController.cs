using Godu.Model.Requests;
using Godu.Service.StepsItems;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me/steps")]
public sealed class MeStepsController : ControllerBase
{
    private readonly IStepsItemService _stepsItemService;
    private readonly ILogger<MeStepsController> _logger;

    public MeStepsController(IStepsItemService stepsItemService, ILogger<MeStepsController> logger)
    {
        _stepsItemService = stepsItemService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var items = await _stepsItemService.ListMineAsync(includeArchived, cancellationToken);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list steps for current user.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _stepsItemService.GetMineAsync(id, cancellationToken);
            return Ok(item);
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
            _logger.LogError(ex, "Failed to get steps item {Id}.", id);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync(
        [FromBody] CreateStepsItemRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var item = await _stepsItemService.CreateMineAsync(request, cancellationToken);
            return Ok(item);
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
            _logger.LogError(ex, "Failed to create steps item.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsync(
        string id,
        [FromBody] UpdateStepsItemRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var item = await _stepsItemService.UpdateMineAsync(id, request, cancellationToken);
            return Ok(item);
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
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update steps item {Id}.", id);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ArchiveAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _stepsItemService.ArchiveMineAsync(id, cancellationToken);
            return Ok(item);
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
            _logger.LogError(ex, "Failed to archive steps item {Id}.", id);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
