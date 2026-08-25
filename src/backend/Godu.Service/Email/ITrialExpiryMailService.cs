namespace Godu.Service.Email;

public interface ITrialExpiryMailService
{
    Task ProcessDueAsync(CancellationToken cancellationToken = default);

    Task ProcessDueAsync(DateTime utcNow, CancellationToken cancellationToken = default);
}
