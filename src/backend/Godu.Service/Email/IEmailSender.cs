namespace Godu.Service.Email;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task SendAsync(
        string to,
        string subject,
        string plainBody,
        CancellationToken cancellationToken = default);
}
