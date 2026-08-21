using Godu.Service.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/analytics")]
public sealed class AdminAnalyticsController : ControllerBase
{
    private readonly IAnalyticsSummaryService _summary;
    private readonly ILogger<AdminAnalyticsController> _logger;

    public AdminAnalyticsController(
        IAnalyticsSummaryService summary,
        ILogger<AdminAnalyticsController> logger)
    {
        _summary = summary;
        _logger = logger;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> SummaryAsync(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? environment,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var toUtc = to?.ToUniversalTime() ?? DateTime.UtcNow;
            var fromUtc = from?.ToUniversalTime() ?? toUtc.AddDays(-30);
            return Ok(await _summary.SummarizeAsync(fromUtc, toUtc, environment, cancellationToken));
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
            _logger.LogError(ex, "Failed to load analytics summary.");
            return Problem(detail: "Unexpected error.", statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
