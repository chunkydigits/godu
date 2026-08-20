using System.Text.RegularExpressions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Repository.Creators;
using Godu.Utility;

namespace Godu.Service.Creators;

public sealed class CreatorService : ICreatorService
{
    private static readonly Regex DataImagePattern = new(
        @"^data:image/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private readonly ICreatorRepository _repository;

    public CreatorService(ICreatorRepository repository)
    {
        _repository = repository;
    }

    public async Task<CreatorDocument> EnsureForUserAsync(
        string userId,
        string displayName,
        string? profileImageUrl,
        string? bio = null,
        CancellationToken cancellationToken = default)
    {
        var existing = await _repository.GetByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (existing is not null)
        {
            return existing;
        }

        var now = DateTime.UtcNow;
        var name = string.IsNullOrWhiteSpace(displayName) ? "Creator" : displayName.Trim();
        return await _repository
            .CreateAsync(
                new CreatorDocument
                {
                    Id = IdGenerator.NewCreatorId(),
                    UserId = userId,
                    DisplayName = name,
                    Bio = Normalize(bio, 500),
                    ProfileImageUrl = NormalizeImage(profileImageUrl),
                    CreatedUtc = now,
                    UpdatedUtc = now,
                },
                cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<CreatorDocument> UpdateForUserAsync(
        string userId,
        string displayName,
        string? bio,
        string? profileImageUrl,
        CancellationToken cancellationToken = default)
    {
        var name = displayName.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("A display name is required.");
        }

        var image = NormalizeImage(profileImageUrl);
        var existing = await EnsureForUserAsync(userId, name, image, bio, cancellationToken)
            .ConfigureAwait(false);
        existing.DisplayName = name;
        existing.Bio = Normalize(bio, 500);
        existing.ProfileImageUrl = image;
        existing.UpdatedUtc = DateTime.UtcNow;
        return await _repository.UpdateAsync(existing, cancellationToken).ConfigureAwait(false);
    }

    private static string? NormalizeImage(string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = string.Concat(trimmed.Where(c => !char.IsWhiteSpace(c)));
        }

        if (trimmed.Length > UpdateCreatorProfileRequest.ProfileImageMaxLength)
        {
            throw new ArgumentException("Profile image is too large. Use a smaller image or an http(s) URL.");
        }

        if (!IsAllowedImage(trimmed))
        {
            throw new ArgumentException(
                "Profile image must be an http(s) URL or a data:image PNG, JPEG, GIF, or WebP.");
        }

        return trimmed;
    }

    private static bool IsAllowedImage(string image)
    {
        if (image.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return DataImagePattern.IsMatch(image);
        }

        return Uri.TryCreate(image, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
    }

    private static string? Normalize(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
