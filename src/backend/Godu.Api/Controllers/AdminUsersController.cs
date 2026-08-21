using Godu.Model.Requests;
using Godu.Service.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _users;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(IAdminUserService users, ILogger<AdminUsersController> logger)
    {
        _users = users;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _users.ListAsync(cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list users.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateAsync(
        string id,
        [FromBody] UpdateAdminUserRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _users.UpdateAsync(id, request, cancellationToken));
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
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update user {UserId}.", id);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
