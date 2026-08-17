using Godu.Model.Configuration;
using Godu.Repository.Cosmos;
using Godu.Repository.ExternalIdentities;
using Godu.Repository.LinkedPlatformAccounts;
using Godu.Repository.StepsItems;
using Godu.Repository.Users;

namespace Godu.Api.Configuration;

public static class RepositoryConfiguration
{
    public static IServiceCollection AddGoduRepositories(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<CosmosOptions>(configuration.GetSection(CosmosOptions.SectionName));

        var cosmos = configuration.GetSection(CosmosOptions.SectionName).Get<CosmosOptions>()
            ?? new CosmosOptions { UseInMemory = true };

        if (cosmos.UseInMemory)
        {
            services.AddSingleton<IExternalIdentityRepository, InMemoryExternalIdentityRepository>();
            services.AddSingleton<ILinkedPlatformAccountRepository, InMemoryLinkedPlatformAccountRepository>();
            services.AddSingleton<IStepsItemRepository, InMemoryStepsItemRepository>();
            services.AddSingleton<IUserRepository, InMemoryUserRepository>();
            return services;
        }

        services.AddSingleton<CosmosClientProvider>();
        services.AddSingleton<IExternalIdentityRepository, CosmosExternalIdentityRepository>();
        services.AddSingleton<ILinkedPlatformAccountRepository, CosmosLinkedPlatformAccountRepository>();
        services.AddSingleton<IStepsItemRepository, CosmosStepsItemRepository>();
        services.AddSingleton<IUserRepository, CosmosUserRepository>();
        return services;
    }
}
