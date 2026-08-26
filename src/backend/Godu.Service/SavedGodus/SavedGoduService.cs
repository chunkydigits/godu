using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.SavedGodus;
using Godu.Service.Identity;
using Godu.Utility;

namespace Godu.Service.SavedGodus;

public sealed class SavedGoduService : ISavedGoduService
{
    public const int DefaultTake = 50;
    public const int MaxTake = 100;

    private readonly ICurrentUser _currentUser;
    private readonly ISavedGoduRepository _saved;

    public SavedGoduService(ICurrentUser currentUser, ISavedGoduRepository saved)
    {
        _currentUser = currentUser;
        _saved = saved;
    }

    public async Task<SavedGoduResponse> SaveAsync(
        SaveGoduRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var goduId = RequireToken(request.GoduId, "Godu id is required.");
        var existing = await _saved.GetAsync(userId, goduId, cancellationToken).ConfigureAwait(false);
        if (existing is not null)
        {
            return ToResponse(existing);
        }

        var document = new SavedGoduDocument
        {
            Id = IdGenerator.SavedGoduId(userId, goduId),
            UserId = userId,
            GoduId = goduId,
            Title = RequireToken(request.Title, "Title is required."),
            CreatorDisplayName = OptionalToken(request.CreatorDisplayName),
            PlayPath = NormalisePlayPath(request.PlayPath),
            Category = NormaliseCategory(request.Category),
            SavedUtc = DateTime.UtcNow,
        };

        var saved = await _saved.UpsertAsync(document, cancellationToken).ConfigureAwait(false);
        return ToResponse(saved);
    }

    public async Task<IReadOnlyList<SavedGoduResponse>> ListMineAsync(
        int take = DefaultTake,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var limit = Math.Clamp(take, 1, MaxTake);
        var items = await _saved.ListByUserAsync(userId, limit, cancellationToken).ConfigureAwait(false);
        return items.Select(ToResponse).ToList();
    }

    public async Task RemoveAsync(string goduId, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var id = RequireToken(goduId, "Godu id is required.");
        var existing = await _saved.GetAsync(userId, id, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            throw new KeyNotFoundException("Saved Godu was not found.");
        }

        await _saved.DeleteAsync(userId, id, cancellationToken).ConfigureAwait(false);
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private static SavedGoduResponse ToResponse(SavedGoduDocument document) =>
        new()
        {
            GoduId = document.GoduId,
            Title = document.Title,
            CreatorDisplayName = document.CreatorDisplayName,
            PlayPath = document.PlayPath,
            Category = document.Category,
            SavedUtc = document.SavedUtc,
        };

    private static string RequireToken(string? value, string message)
    {
        var token = value?.Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException(message);
        }

        return token;
    }

    private static string? OptionalToken(string? value)
    {
        var token = value?.Trim();
        return string.IsNullOrWhiteSpace(token) ? null : token;
    }

    private static string NormalisePlayPath(string? playPath)
    {
        var path = RequireToken(playPath, "Play path is required.");
        if (!path.StartsWith('/') || path.StartsWith("//", StringComparison.Ordinal))
        {
            throw new ArgumentException("Play path must be a site-relative URL.");
        }

        return path;
    }

    private static string? NormaliseCategory(string? category)
    {
        var value = OptionalToken(category);
        if (value is null)
        {
            return null;
        }

        if (value.Length > 40)
        {
            throw new ArgumentException("Category must be 40 characters or fewer.");
        }

        return value;
    }
}
