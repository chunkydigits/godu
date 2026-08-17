using Azure.Core;
using Azure.Identity;

namespace Godu.Api.Configuration;

internal static class AzureCredential
{
    public static TokenCredential Create(IHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            return new DefaultAzureCredential();
        }

        // App Service must use its own managed identity. DefaultAzureCredential
        // otherwise spends ~30s trying Visual Studio / Azure CLI, then the
        // container is killed (exit 155).
        return new ManagedIdentityCredential();
    }
}
