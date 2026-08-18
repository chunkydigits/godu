using Godu.Service.Creators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/creators")]
public sealed class PublicCreatorsController : ControllerBase
{
    private readonly ICreatorProfileService _creators;
    private readonly ILogger<PublicCreatorsController> _logger;

    public PublicCreatorsController(
        ICreatorProfileService creators,
        ILogger<PublicCreatorsController> logger)
    {
        _creators = creators;
        _logger = logger;
    }

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _creators.GetPublicAsync(userId, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load creator {UserId}.", userId);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
