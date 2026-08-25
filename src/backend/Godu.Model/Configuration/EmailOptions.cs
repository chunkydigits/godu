namespace Godu.Model.Configuration;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>Verified SES from-address, e.g. noreply@godu.it.</summary>
    public string From { get; set; } = string.Empty;

    public string FromName { get; set; } = "Godu";

    /// <summary>AWS region for SES, e.g. eu-north-1.</summary>
    public string Region { get; set; } = "eu-north-1";

    /// <summary>Loaded from Key Vault as Email:AccessKeyId (secret name Email--AccessKeyId).</summary>
    public string AccessKeyId { get; set; } = string.Empty;

    /// <summary>Loaded from Key Vault as Email:SecretAccessKey (secret name Email--SecretAccessKey).</summary>
    public string SecretAccessKey { get; set; } = string.Empty;

    public int PollIntervalHours { get; set; } = 1;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(From)
        && !string.IsNullOrWhiteSpace(Region)
        && !string.IsNullOrWhiteSpace(AccessKeyId)
        && !string.IsNullOrWhiteSpace(SecretAccessKey);
}
