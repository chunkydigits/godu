using Godu.Service.Creators;
using Godu.Service.StepsItems;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/{providerAlias:regex(^(t|tiktok|y|youtube|i|instagram|v|vimeo)$)}/{username}")]
public sealed class PublicStepsController : ControllerBase
{
    private readonly IStepsItemService _stepsItemService;
    private readonly ICreatorProfileService _creators;
    private readonly ILogger<PublicStepsController> _logger;

    public PublicStepsController(
        IStepsItemService stepsItemService,
        ICreatorProfileService creators,
        ILogger<PublicStepsController> logger)
    {
        _stepsItemService = stepsItemService;
        _creators = creators;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(
        string providerAlias,
        string username,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _creators.GetPublicByHandleAsync(providerAlias, username, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list public steps {Provider}/{Username}.", providerAlias, username);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpGet("{slug}")]
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

    [HttpGet("{slug}/related")]
    public async Task<IActionResult> RelatedAsync(
        string providerAlias,
        string username,
        string slug,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _stepsItemService.ListRelatedPublicAsync(
                providerAlias,
                username,
                slug,
                cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to list related steps {Provider}/{Username}/{Slug}.",
                providerAlias,
                username,
                slug);
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
