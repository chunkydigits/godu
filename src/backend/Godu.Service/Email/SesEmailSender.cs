using Amazon;
using Amazon.Runtime;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using Godu.Model.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Godu.Service.Email;

public sealed class SesEmailSender : IEmailSender, IDisposable
{
    private readonly EmailOptions _options;
    private readonly ILogger<SesEmailSender> _logger;
    private readonly Lazy<AmazonSimpleEmailServiceV2Client> _client;

    public SesEmailSender(IOptions<EmailOptions> options, ILogger<SesEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
        _client = new Lazy<AmazonSimpleEmailServiceV2Client>(CreateClient);
    }

    public bool IsConfigured => _options.IsConfigured;

    public async Task SendAsync(
        string to,
        string subject,
        string plainBody,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("Email/SES is not configured.");
        }

        var from = _options.From.Trim();
        var request = new SendEmailRequest
        {
            FromEmailAddress = from,
            Destination = new Destination { ToAddresses = [to.Trim()] },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = subject },
                    Body = new Body { Text = new Content { Data = plainBody } },
                },
            },
        };

        await _client.Value.SendEmailAsync(request, cancellationToken).ConfigureAwait(false);
        _logger.LogInformation("Sent email '{Subject}'.", subject);
    }

    public void Dispose()
    {
        if (_client.IsValueCreated)
        {
            _client.Value.Dispose();
        }
    }

    private AmazonSimpleEmailServiceV2Client CreateClient()
    {
        var credentials = new BasicAWSCredentials(_options.AccessKeyId, _options.SecretAccessKey);
        var region = RegionEndpoint.GetBySystemName(_options.Region.Trim());
        return new AmazonSimpleEmailServiceV2Client(credentials, region);
    }
}
