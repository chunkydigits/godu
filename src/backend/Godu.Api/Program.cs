using System.Text.Json.Serialization;
using Godu.Api.Configuration;
using Godu.Api.Middleware;
using Godu.Model.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "GoduSpa",
        policy => policy
            .WithOrigins("http://localhost:4200")
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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("GoduSpa");
app.UseAuthentication();
app.UseMiddleware<CurrentUserMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();
