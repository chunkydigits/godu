using Godu.Model.Requests;
using Godu.Service.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Godu.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/analytics/events")]
public sealed class AnalyticsEventsController : ControllerBase
{
    private readonly IAnalyticsIngestService _ingest;
    private readonly ILogger<AnalyticsEventsController> _logger;

    public AnalyticsEventsController(
        IAnalyticsIngestService ingest,
        ILogger<AnalyticsEventsController> logger)
    {
        _ingest = ingest;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> IngestAsync(
        [FromBody] IngestAnalyticsEventRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            await _ingest.IngestAsync(request, Request.Headers.UserAgent.ToString(), cancellationToken);
            return Ok();
        }
        catch (ArgumentException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Analytics ingest failed.");
            return Ok();
        }
    }
}
