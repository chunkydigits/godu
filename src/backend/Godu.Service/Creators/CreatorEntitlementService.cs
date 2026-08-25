using Godu.Model.Creators;
using Godu.Model.Documents;
using Godu.Model.Enums;
using Godu.Repository.Users;
using Godu.Service.Identity;
using Godu.Service.Mapping;

namespace Godu.Service.Creators;

public sealed class CreatorEntitlementService : ICreatorEntitlementService
{
    public const int TrialDurationMonths = 3;

    private readonly IUserRepository _users;
    private readonly IAdminAccessService _admin;

    public CreatorEntitlementService(IUserRepository users, IAdminAccessService admin)
    {
        _users = users;
        _admin = admin;
    }

    public CreatorEntitlement Evaluate(UserDocument user, DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;
        if (now.Kind == DateTimeKind.Unspecified)
        {
            now = DateTime.SpecifyKind(now, DateTimeKind.Utc);
        }
        else
        {
            now = now.ToUniversalTime();
        }

        var skipped = SkipsTrialClock(user);
        var stored = CreatorSubscriptionMapper.ParseStatus(user.CreatorSubscriptionStatus);
        var trialStarted = user.TrialStartedAt;
        var trialEnds = user.TrialEndsAt;
        var subscriptionStarted = user.SubscriptionStartedAt;
        var subscriptionEnds = user.SubscriptionEndsAt;

        if (skipped)
        {
            return new CreatorEntitlement
            {
                Status = stored,
                TrialStartedAt = trialStarted,
                TrialEndsAt = trialEnds,
                SubscriptionStartedAt = subscriptionStarted,
                SubscriptionEndsAt = subscriptionEnds,
                HasActiveEntitlement = true,
                TrialClockSkipped = true,
            };
        }

        if (HasPaidEntitlement(stored, subscriptionEnds, now))
        {
            return new CreatorEntitlement
            {
                Status = stored is CreatorSubscriptionStatus.Cancelled
                    ? CreatorSubscriptionStatus.Cancelled
                    : CreatorSubscriptionStatus.Active,
                TrialStartedAt = trialStarted,
                TrialEndsAt = trialEnds,
                SubscriptionStartedAt = subscriptionStarted,
                SubscriptionEndsAt = subscriptionEnds,
                HasActiveEntitlement = true,
                TrialClockSkipped = false,
            };
        }

        if (trialStarted is not null && trialEnds is not null && now < ToUtc(trialEnds.Value))
        {
            return new CreatorEntitlement
            {
                Status = CreatorSubscriptionStatus.Trial,
                TrialStartedAt = trialStarted,
                TrialEndsAt = trialEnds,
                SubscriptionStartedAt = subscriptionStarted,
                SubscriptionEndsAt = subscriptionEnds,
                HasActiveEntitlement = true,
                TrialClockSkipped = false,
            };
        }

        if (trialStarted is not null)
        {
            return new CreatorEntitlement
            {
                Status = CreatorSubscriptionStatus.Expired,
                TrialStartedAt = trialStarted,
                TrialEndsAt = trialEnds,
                SubscriptionStartedAt = subscriptionStarted,
                SubscriptionEndsAt = subscriptionEnds,
                HasActiveEntitlement = false,
                TrialClockSkipped = false,
            };
        }

        return new CreatorEntitlement
        {
            Status = CreatorSubscriptionStatus.NotStarted,
            TrialStartedAt = null,
            TrialEndsAt = null,
            SubscriptionStartedAt = subscriptionStarted,
            SubscriptionEndsAt = subscriptionEnds,
            HasActiveEntitlement = false,
            TrialClockSkipped = false,
        };
    }

    public async Task<CreatorEntitlement> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return Evaluate(user);
    }

    public async Task StartTrialIfNeededAsync(
        string userId,
        DateTime publishedUtc,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (SkipsTrialClock(user) || user.TrialStartedAt is not null)
        {
            return;
        }

        var started = ToUtc(publishedUtc);
        user.TrialStartedAt = started;
        user.TrialEndsAt = started.AddMonths(TrialDurationMonths);
        user.CreatorSubscriptionStatus = CreatorSubscriptionMapper.Trial;
        user.UpdatedUtc = DateTime.UtcNow;

        await _users.UpdateAsync(user, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> HasPublicEntitlementAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            return false;
        }

        return Evaluate(user).HasActiveEntitlement;
    }

    private bool SkipsTrialClock(UserDocument user) =>
        user.IsAdmin
        || _admin.IsConfiguredAdmin(user.Id)
        || _admin.IsEffectiveInternal(user);

    private static bool HasPaidEntitlement(
        CreatorSubscriptionStatus stored,
        DateTime? subscriptionEnds,
        DateTime now)
    {
        if (stored is not CreatorSubscriptionStatus.Active and not CreatorSubscriptionStatus.Cancelled)
        {
            return false;
        }

        if (subscriptionEnds is null)
        {
            return stored == CreatorSubscriptionStatus.Active;
        }

        return now < ToUtc(subscriptionEnds.Value);
    }

    private static DateTime ToUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        return value.ToUniversalTime();
    }
}
