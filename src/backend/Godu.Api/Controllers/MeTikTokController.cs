using Godu.Service.TikTok;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me/tiktok")]
public sealed class MeTikTokController : ControllerBase
{
    private readonly ITikTokOEmbedService _tikTokOEmbed;
    private readonly ILogger<MeTikTokController> _logger;

    public MeTikTokController(ITikTokOEmbedService tikTokOEmbed, ILogger<MeTikTokController> logger)
    {
        _tikTokOEmbed = tikTokOEmbed;
        _logger = logger;
    }

    /// <summary>
    /// Looks up public TikTok video metadata via TikTok's official oEmbed endpoint.
    /// </summary>
    [HttpGet("oembed")]
    public async Task<IActionResult> LookupOEmbedAsync(
        [FromQuery] string url,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return Problem(detail: "url is required.", statusCode: StatusCodes.Status400BadRequest);
            }

            var metadata = await _tikTokOEmbed.LookupAsync(url, cancellationToken);
            if (metadata is null)
            {
                return Problem(detail: "TikTok video metadata not found.", statusCode: StatusCodes.Status404NotFound);
            }

            return Ok(metadata);
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TikTok oEmbed lookup failed.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
