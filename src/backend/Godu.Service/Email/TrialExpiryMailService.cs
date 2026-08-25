using System.Globalization;
using Godu.Model.Analytics;
using Godu.Model.Configuration;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Repository.Users;
using Godu.Service.Analytics;
using Godu.Service.Creators;
using Godu.Service.Mapping;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Godu.Service.Email;

public sealed class TrialExpiryMailService : ITrialExpiryMailService
{
    public const int WarningDays = 7;

    private readonly IUserRepository _users;
    private readonly ICreatorEntitlementService _entitlement;
    private readonly IEmailSender _email;
    private readonly IAnalyticsRecorder _analytics;
    private readonly CreatorMonetisationOptions _monetisation;
    private readonly ILogger<TrialExpiryMailService> _logger;

    public TrialExpiryMailService(
        IUserRepository users,
        ICreatorEntitlementService entitlement,
        IEmailSender email,
        IAnalyticsRecorder analytics,
        IOptions<CreatorMonetisationOptions> monetisation,
        ILogger<TrialExpiryMailService> logger)
    {
        _users = users;
        _entitlement = entitlement;
        _email = email;
        _analytics = analytics;
        _monetisation = monetisation.Value;
        _logger = logger;
    }

    public Task ProcessDueAsync(CancellationToken cancellationToken = default) =>
        ProcessDueAsync(DateTime.UtcNow, cancellationToken);

    public async Task ProcessDueAsync(DateTime utcNow, CancellationToken cancellationToken = default)
    {
        if (!_email.IsConfigured)
        {
            _logger.LogWarning("Email/SES is not configured; trial expiry mail will be skipped.");
        }

        var now = utcNow.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(utcNow, DateTimeKind.Utc)
            : utcNow.ToUniversalTime();
        var users = await _users.ListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var user in users)
        {
            await ProcessUserAsync(user, now, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task ProcessUserAsync(UserDocument user, DateTime now, CancellationToken cancellationToken)
    {
        var entitlement = _entitlement.Evaluate(user, now);
        if (entitlement.TrialClockSkipped || entitlement.TrialEndsAt is null)
        {
            return;
        }

        var trialEnds = ToUtc(entitlement.TrialEndsAt.Value);
        if (now >= trialEnds && !entitlement.HasActiveEntitlement)
        {
            await RecordExpiryIfNeededAsync(user, cancellationToken).ConfigureAwait(false);
        }

        if (!_email.IsConfigured)
        {
            return;
        }

        if (user.TrialWarningEmailSentAt is null && now >= trialEnds.AddDays(-WarningDays) && now < trialEnds)
        {
            await SendIfPossibleAsync(
                    user,
                    WarningSubject(),
                    WarningBody(trialEnds),
                    sent => user.TrialWarningEmailSentAt = sent,
                    cancellationToken)
                .ConfigureAwait(false);
        }

        if (user.TrialEndedEmailSentAt is null && now >= trialEnds && !entitlement.HasActiveEntitlement)
        {
            await SendIfPossibleAsync(
                    user,
                    EndedSubject(),
                    EndedBody(trialEnds),
                    sent => user.TrialEndedEmailSentAt = sent,
                    cancellationToken)
                .ConfigureAwait(false);
        }
    }

    private async Task RecordExpiryIfNeededAsync(UserDocument user, CancellationToken cancellationToken)
    {
        if (CreatorSubscriptionMapper.ParseStatus(user.CreatorSubscriptionStatus)
            == CreatorSubscriptionStatus.Expired)
        {
            return;
        }

        var recorded = await _analytics
            .RecordForUserAsync(
                user.Id,
                AnalyticsEventNames.TrialExpired,
                platform: "tiktok",
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        if (!recorded)
        {
            return;
        }

        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Expired;
        user.UpdatedUtc = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
    }

    private async Task SendIfPossibleAsync(
        UserDocument user,
        string subject,
        string body,
        Action<DateTime> markSent,
        CancellationToken cancellationToken)
    {
        var to = user.Email?.Trim();
        if (string.IsNullOrEmpty(to) || !to.Contains('@', StringComparison.Ordinal))
        {
            _logger.LogInformation("Skipping trial email for {UserId}; no email on the user.", user.Id);
            return;
        }

        try
        {
            await _email.SendAsync(to, subject, body, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Failed to send trial email to {UserId}.", user.Id);
            return;
        }

        markSent(DateTime.UtcNow);
        user.UpdatedUtc = DateTime.UtcNow;
        await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
    }

    private static string WarningSubject() => "Your Godu creator trial ends in 7 days";

    private static string EndedSubject() => "Your Godu creator trial has ended";

    private string WarningBody(DateTime trialEndsUtc) =>
        "Your 3-month Godu creator trial ends on "
        + FormatDate(trialEndsUtc)
        + ". After that date, your public Godus and public creator page will not be visible to viewers. "
        + "You can still create and play private Godus. "
        + "Publishing publicly will require a "
        + FormatPrice()
        + "/month subscription. There is no payment link yet — details are in Settings.";

    private string EndedBody(DateTime trialEndsUtc) =>
        "Your Godu creator trial ended on "
        + FormatDate(trialEndsUtc)
        + ". Public Godus and your public creator page are no longer visible to viewers. "
        + "You can still create and play private Godus. "
        + "Publishing publicly will require a "
        + FormatPrice()
        + "/month subscription. Previously public Godus will come back on together when you subscribe.";

    private string FormatPrice() =>
        "£" + _monetisation.MonthlyPriceGbp.ToString("0.00", CultureInfo.InvariantCulture);

    private static string FormatDate(DateTime utc) =>
        ToUtc(utc).ToString("d MMMM yyyy", CultureInfo.InvariantCulture) + " UTC";

    private static DateTime ToUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        return value.ToUniversalTime();
    }
}
