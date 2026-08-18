using Godu.Model.Documents;
using Godu.Model.Responses;

namespace Godu.Service.Mapping;

public static class CreatorSocialMapper
{
    public static IReadOnlyList<CreatorSocialResponse> Combine(
        IEnumerable<LinkedPlatformAccountDocument> accounts,
        VideoReferenceDocument? video = null)
    {
        var socials = accounts
            .Select(FromAccount)
            .Where(s => s is not null)
            .Cast<CreatorSocialResponse>()
            .GroupBy(s => $"{s.Provider}:{s.Username}", StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

        if (socials.Count > 0)
        {
            return socials;
        }

        var fromVideo = FromVideo(video);
        return fromVideo is null ? [] : [fromVideo];
    }

    public static CreatorSocialResponse? FromAccount(LinkedPlatformAccountDocument account)
    {
        var username = account.Username?.Trim().TrimStart('@');
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        var profileUrl = string.IsNullOrWhiteSpace(account.ProfileUrl)
            ? ProfileUrl(account.Provider, username)
            : account.ProfileUrl;

        if (string.IsNullOrWhiteSpace(profileUrl))
        {
            return null;
        }

        return new CreatorSocialResponse
        {
            Provider = account.Provider.Trim().ToLowerInvariant(),
            Username = username.ToLowerInvariant(),
            ProfileUrl = profileUrl,
            DisplayName = account.DisplayName,
        };
    }

    public static CreatorSocialResponse? FromVideo(VideoReferenceDocument? video)
    {
        var username = video?.CreatorUsername?.Trim().TrimStart('@');
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        var provider = string.IsNullOrWhiteSpace(video!.Provider)
            ? "tiktok"
            : video.Provider.Trim().ToLowerInvariant();
        var profileUrl = ProfileUrl(provider, username);
        if (profileUrl is null)
        {
            return null;
        }

        return new CreatorSocialResponse
        {
            Provider = provider,
            Username = username.ToLowerInvariant(),
            ProfileUrl = profileUrl,
        };
    }

    public static string? ProfileUrl(string provider, string username)
    {
        var handle = username.Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(handle))
        {
            return null;
        }

        return provider.Trim().ToLowerInvariant() switch
        {
            "tiktok" => $"https://www.tiktok.com/@{handle}",
            "instagram" => $"https://www.instagram.com/{handle}/",
            "youtube" => $"https://www.youtube.com/@{handle}",
            _ => null,
        };
    }
}
