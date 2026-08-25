using Azure.Identity;
using Godu.Model.Configuration;
using Godu.Service.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

var to = args.Length > 0 ? args[0] : "andy@chunkydigits.com";
var apiDir = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "Godu.Api"));

var builder = Host.CreateApplicationBuilder(args);
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile(Path.Combine(apiDir, "appsettings.json"), optional: false)
    .AddJsonFile(Path.Combine(apiDir, "appsettings.Development.json"), optional: false);

var vaultUri = builder.Configuration["KeyVault:VaultUri"];
if (string.IsNullOrWhiteSpace(vaultUri))
{
    Console.Error.WriteLine("KeyVault:VaultUri is missing.");
    return 1;
}

builder.Configuration.AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential());
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
builder.Services.AddSingleton<IEmailSender, SesEmailSender>();
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

using var host = builder.Build();
var options = host.Services.GetRequiredService<IOptions<EmailOptions>>().Value;
var sender = host.Services.GetRequiredService<IEmailSender>();

Console.WriteLine($"Vault: {vaultUri}");
Console.WriteLine($"From: {options.From}");
Console.WriteLine($"Region: {options.Region}");
Console.WriteLine($"Configured: {sender.IsConfigured}");
Console.WriteLine($"To: {to}");

if (!sender.IsConfigured)
{
    Console.Error.WriteLine("SES is not configured. Check Email--AccessKeyId and Email--SecretAccessKey in Key Vault.");
    return 1;
}

await sender.SendAsync(
    to,
    "Godu SES test",
    "This is a test message from Godu using Amazon SES (access key). If you received this, local Key Vault and SES are working.");

Console.WriteLine("Sent.");
return 0;
