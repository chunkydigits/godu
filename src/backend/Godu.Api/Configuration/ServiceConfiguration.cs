using Godu.Service.Analytics;
using Godu.Service.Creators;
using Godu.Service.Identity;
using Godu.Service.PlayHistory;
using Godu.Service.PlatformAccounts;
using Godu.Service.StepsItems;
using Godu.Service.TikTok;

namespace Godu.Api.Configuration;

public static class ServiceConfiguration
{
    public static IServiceCollection AddGoduServices(this IServiceCollection services)
    {
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<ILinkedPlatformAccountService, LinkedPlatformAccountService>();
        services.AddScoped<IStepsItemService, StepsItemService>();
        services.AddScoped<ICreatorProfileService, CreatorProfileService>();
        services.AddScoped<ICreatorService, CreatorService>();
        services.AddScoped<ITikTokAccessTokenResolver, TikTokAccessTokenResolver>();
        services.AddScoped<ITikTokVideoOwnershipVerifier, TikTokVideoOwnershipVerifier>();
        services.AddScoped<IUserProvisioningService, UserProvisioningService>();
        services.AddScoped<IUserSettingsService, UserSettingsService>();
        services.AddScoped<IAdminAccessService, AdminAccessService>();
        services.AddScoped<IMeService, MeService>();
        services.AddScoped<IAdminUserService, AdminUserService>();
        services.AddScoped<IAnalyticsIngestService, AnalyticsIngestService>();
        services.AddScoped<IAnalyticsSummaryService, AnalyticsSummaryService>();
        services.AddScoped<IPlayHistoryService, PlayHistoryService>();
        services.AddSingleton<IPlatformOAuthStateStore, InMemoryPlatformOAuthStateStore>();
        services.AddSingleton<IPlatformTokenProtector, DataProtectionPlatformTokenProtector>();
        services.AddHttpClient<ITikTokOAuthClient, TikTokOAuthClient>(client =>
        {
            client.BaseAddress = new Uri("https://open.tiktokapis.com/");
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Godu/1.0 (+https://godu.it)");
        });
        services.AddHttpClient<ITikTokOEmbedService, TikTokOEmbedService>(client =>
        {
            client.BaseAddress = new Uri("https://www.tiktok.com/");
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Godu/1.0 (+https://godu.it)");
        });
        return services;
    }
}
