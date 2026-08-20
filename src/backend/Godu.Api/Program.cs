using Godu.Api.Configuration;
using Godu.Api.Middleware;
using Godu.Model.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

var keyVaultUri = builder.Configuration[$"{KeyVaultOptions.SectionName}:VaultUri"];
if (!string.IsNullOrWhiteSpace(keyVaultUri))
{
    try
    {
        var credential = AzureCredential.Create(builder.Environment);
        builder.Configuration.AddAzureKeyVault(new Uri(keyVaultUri), credential);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine(
            $"GODU: Failed to load Key Vault '{keyVaultUri}'. " +
            "On App Service, enable a system-assigned managed identity and grant it Key Vault Secrets User on this vault. " +
            $"Details: {ex}");
        throw;
    }
}

builder.Services.AddDataProtection();
builder.Services.Configure<Auth0Options>(builder.Configuration.GetSection(Auth0Options.SectionName));
builder.Services.Configure<TikTokOptions>(builder.Configuration.GetSection(TikTokOptions.SectionName));
var auth0 = builder.Configuration.GetSection(Auth0Options.SectionName).Get<Auth0Options>()
    ?? throw new InvalidOperationException("Auth0 configuration is required.");

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var corsOrigins = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>()?.AllowedOrigins
    ?? [];
if (corsOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins is required.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "GoduSpa",
        policy => policy
            .SetIsOriginAllowed(origin => IsAllowedCorsOrigin(origin, corsOrigins))
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{auth0.Domain}/";
        options.Audience = auth0.Audience;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://{auth0.Domain}/",
            ValidateAudience = true,
            ValidAudience = auth0.Audience,
            ValidateLifetime = true,
            NameClaimType = "name",
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddGoduRepositories(builder.Configuration);
builder.Services.AddGoduServices();

var app = builder.Build();

// CORS before anything that can redirect or challenge. Cloudflare terminates
// TLS for https://dev-api.godu.it and typically forwards HTTP to Kestrel;
// HTTPS redirection here would send the browser to localhost and surface as status 0.
app.UseCors("GoduSpa");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthentication();
app.UseMiddleware<CurrentUserMiddleware>();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();

static bool IsAllowedCorsOrigin(string origin, string[] allowedOrigins)
{
    if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        return true;
    }

    return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && uri.Host.EndsWith(".azurestaticapps.net", StringComparison.OrdinalIgnoreCase);
}
