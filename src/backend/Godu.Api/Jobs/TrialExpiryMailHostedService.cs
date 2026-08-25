using Godu.Model.Configuration;
using Godu.Service.Email;
using Microsoft.Extensions.Options;

namespace Godu.Api.Jobs;

public sealed class TrialExpiryMailHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly EmailOptions _options;
    private readonly ILogger<TrialExpiryMailHostedService> _logger;

    public TrialExpiryMailHostedService(
        IServiceScopeFactory scopes,
        IOptions<EmailOptions> options,
        ILogger<TrialExpiryMailHostedService> logger)
    {
        _scopes = scopes;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var hours = _options.PollIntervalHours < 1 ? 1 : _options.PollIntervalHours;
        using var timer = new PeriodicTimer(TimeSpan.FromHours(hours));
        await ProcessSafelyAsync(stoppingToken).ConfigureAwait(false);
        while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
        {
            await ProcessSafelyAsync(stoppingToken).ConfigureAwait(false);
        }
    }

    private async Task ProcessSafelyAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var mail = scope.ServiceProvider.GetRequiredService<ITrialExpiryMailService>();
            await mail.ProcessDueAsync(stoppingToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Trial expiry mail job failed.");
        }
    }
}
