using Godu.Service.StepsItems;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/{providerAlias}/{username}/{slug}")]
public sealed class PublicStepsController : ControllerBase
{
    private readonly IStepsItemService _stepsItemService;
    private readonly ILogger<PublicStepsController> _logger;

    public PublicStepsController(IStepsItemService stepsItemService, ILogger<PublicStepsController> logger)
    {
        _stepsItemService = stepsItemService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAsync(
        string providerAlias,
        string username,
        string slug,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _stepsItemService.GetPublicAsync(
                providerAlias,
                username,
                slug,
                cancellationToken);

            if (item is null)
            {
                return Problem(detail: "Public steps item not found.", statusCode: StatusCodes.Status404NotFound);
            }

            return Ok(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to get public steps {Provider}/{Username}/{Slug}.",
                providerAlias,
                username,
                slug);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
