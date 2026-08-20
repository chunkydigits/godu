using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Godu.Model.Configuration;
using Microsoft.Extensions.Options;

namespace Godu.Service.TikTok;

public sealed class TikTokOAuthClient : ITikTokOAuthClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly TikTokOptions _options;

    public TikTokOAuthClient(HttpClient httpClient, IOptions<TikTokOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<TikTokTokenResult> ExchangeCodeAsync(
        string code,
        string redirectUri,
        CancellationToken cancellationToken = default)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_key"] = _options.ClientKey,
            ["client_secret"] = _options.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = redirectUri,
        });

        using var response = await _httpClient
            .PostAsync("v2/oauth/token/", content, cancellationToken)
            .ConfigureAwait(false);

        await using var stream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);

        var payload = await JsonSerializer
            .DeserializeAsync<TokenPayload>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode
            || payload is null
            || string.IsNullOrWhiteSpace(payload.AccessToken)
            || string.IsNullOrWhiteSpace(payload.OpenId))
        {
            var detail = payload?.ErrorDescription ?? payload?.Error ?? response.StatusCode.ToString();
            throw new InvalidOperationException($"TikTok token exchange failed ({detail}).");
        }

        return new TikTokTokenResult
        {
            AccessToken = payload.AccessToken,
            OpenId = payload.OpenId,
            RefreshToken = string.IsNullOrWhiteSpace(payload.RefreshToken) ? null : payload.RefreshToken,
            ExpiresInSeconds = payload.ExpiresIn,
            RefreshExpiresInSeconds = payload.RefreshExpiresIn,
            Scope = payload.Scope,
        };
    }

    public async Task<TikTokUserInfo> GetUserInfoAsync(
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _httpClient
            .SendAsync(request, cancellationToken)
            .ConfigureAwait(false);

        await using var stream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);

        var payload = await JsonSerializer
            .DeserializeAsync<UserInfoPayload>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);

        var user = payload?.Data?.User;
        var errorCode = payload?.Error?.Code;
        if (!response.IsSuccessStatusCode
            || user is null
            || string.IsNullOrWhiteSpace(user.OpenId)
            || (!string.IsNullOrWhiteSpace(errorCode)
                && !errorCode.Equals("ok", StringComparison.OrdinalIgnoreCase)))
        {
            var detail = payload?.Error?.Message ?? errorCode ?? response.StatusCode.ToString();
            throw new InvalidOperationException($"TikTok user info failed ({detail}).");
        }

        return new TikTokUserInfo
        {
            OpenId = user.OpenId,
            Username = string.IsNullOrWhiteSpace(user.Username) ? null : user.Username.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(user.DisplayName) ? null : user.DisplayName.Trim(),
            AvatarUrl = string.IsNullOrWhiteSpace(user.AvatarUrl) ? null : user.AvatarUrl.Trim(),
        };
    }

    public async Task RevokeAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_key"] = _options.ClientKey,
            ["client_secret"] = _options.ClientSecret,
            ["token"] = accessToken,
        });

        using var response = await _httpClient
            .PostAsync("v2/oauth/revoke/", content, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"TikTok token revoke failed ({(int)response.StatusCode}).");
        }
    }

    public async Task<TikTokTokenResult> RefreshAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_key"] = _options.ClientKey,
            ["client_secret"] = _options.ClientSecret,
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken,
        });

        using var response = await _httpClient
            .PostAsync("v2/oauth/token/", content, cancellationToken)
            .ConfigureAwait(false);

        await using var stream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);

        var payload = await JsonSerializer
            .DeserializeAsync<TokenPayload>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode
            || payload is null
            || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            var detail = payload?.ErrorDescription ?? payload?.Error ?? response.StatusCode.ToString();
            throw new InvalidOperationException($"TikTok token refresh failed ({detail}).");
        }

        return new TikTokTokenResult
        {
            AccessToken = payload.AccessToken,
            OpenId = payload.OpenId ?? string.Empty,
            RefreshToken = string.IsNullOrWhiteSpace(payload.RefreshToken) ? refreshToken : payload.RefreshToken,
            ExpiresInSeconds = payload.ExpiresIn,
            RefreshExpiresInSeconds = payload.RefreshExpiresIn,
            Scope = payload.Scope,
        };
    }

    public async Task<bool> UserOwnsVideoAsync(
        string accessToken,
        string externalVideoId,
        CancellationToken cancellationToken = default)
    {
        var body = JsonSerializer.Serialize(
            new { filters = new { video_ids = new[] { externalVideoId } } });
        using var request = new HttpRequestMessage(HttpMethod.Post, "v2/video/query/?fields=id")
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _httpClient
            .SendAsync(request, cancellationToken)
            .ConfigureAwait(false);

        await using var stream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);

        var payload = await JsonSerializer
            .DeserializeAsync<VideoQueryPayload>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);

        var errorCode = payload?.Error?.Code;
        if (!response.IsSuccessStatusCode
            || (!string.IsNullOrWhiteSpace(errorCode)
                && !errorCode.Equals("ok", StringComparison.OrdinalIgnoreCase)))
        {
            var detail = payload?.Error?.Message ?? errorCode ?? response.StatusCode.ToString();
            throw new InvalidOperationException($"TikTok video query failed ({detail}).");
        }

        return payload?.Data?.Videos?.Any(v =>
            string.Equals(v.Id, externalVideoId, StringComparison.Ordinal)) == true;
    }

    private sealed class TokenPayload
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("open_id")]
        public string? OpenId { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("refresh_expires_in")]
        public int RefreshExpiresIn { get; set; }

        [JsonPropertyName("scope")]
        public string? Scope { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }

        [JsonPropertyName("error_description")]
        public string? ErrorDescription { get; set; }
    }

    private sealed class UserInfoPayload
    {
        [JsonPropertyName("data")]
        public UserInfoData? Data { get; set; }

        [JsonPropertyName("error")]
        public UserInfoError? Error { get; set; }
    }

    private sealed class UserInfoData
    {
        [JsonPropertyName("user")]
        public UserInfoUser? User { get; set; }
    }

    private sealed class UserInfoUser
    {
        [JsonPropertyName("open_id")]
        public string? OpenId { get; set; }

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("avatar_url")]
        public string? AvatarUrl { get; set; }
    }

    private sealed class UserInfoError
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }

    private sealed class VideoQueryPayload
    {
        [JsonPropertyName("data")]
        public VideoQueryData? Data { get; set; }

        [JsonPropertyName("error")]
        public UserInfoError? Error { get; set; }
    }

    private sealed class VideoQueryData
    {
        [JsonPropertyName("videos")]
        public List<VideoQueryItem>? Videos { get; set; }
    }

    private sealed class VideoQueryItem
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }
}
