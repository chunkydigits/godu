using Godu.Model.Documents;
using Godu.Model.PlayHistory;
using Godu.Model.Requests;
using Godu.Model.Responses;
using Godu.Repository.PlayHistory;
using Godu.Service.Identity;
using Godu.Utility;

namespace Godu.Service.PlayHistory;

public interface IPlayHistoryService
{
    Task<PlayHistoryResponse> RecordAsync(
        RecordPlayHistoryRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlayHistoryResponse>> ListMineAsync(
        int take = 50,
        CancellationToken cancellationToken = default);
}

public sealed class PlayHistoryService : IPlayHistoryService
{
    public const int DefaultTake = 50;
    public const int MaxTake = 100;

    private readonly ICurrentUser _currentUser;
    private readonly IPlayHistoryRepository _history;

    public PlayHistoryService(ICurrentUser currentUser, IPlayHistoryRepository history)
    {
        _currentUser = currentUser;
        _history = history;
    }

    public async Task<PlayHistoryResponse> RecordAsync(
        RecordPlayHistoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var goduId = RequireToken(request.GoduId, "Godu id is required.");
        var title = RequireToken(request.Title, "Title is required.");
        var playPath = NormalisePlayPath(request.PlayPath);
        var source = RequireSource(request.Source);
        var eventName = RequireEvent(request.Event);
        var now = DateTime.UtcNow;

        var existing = await _history.GetAsync(userId, goduId, cancellationToken).ConfigureAwait(false);
        var document = existing is null
            ? NewDocument(userId, goduId, title, request.CreatorDisplayName, playPath, source, now)
            : existing;

        document.Title = title;
        document.CreatorDisplayName = string.IsNullOrWhiteSpace(request.CreatorDisplayName)
            ? document.CreatorDisplayName
            : request.CreatorDisplayName.Trim();
        document.PlayPath = playPath;
        document.Source = source;
        document.UpdatedUtc = now;

        if (eventName == PlayHistoryEvents.Completed)
        {
            if (existing is null)
            {
                document.StartedCount = 1;
                document.LastStartedUtc = now;
            }

            document.CompletedCount += 1;
            document.LastCompletedUtc = now;
        }
        else
        {
            document.StartedCount += 1;
            document.LastStartedUtc = now;
        }

        var saved = await _history.UpsertAsync(document, cancellationToken).ConfigureAwait(false);
        return ToResponse(saved);
    }

    public async Task<IReadOnlyList<PlayHistoryResponse>> ListMineAsync(
        int take = DefaultTake,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        var limit = Math.Clamp(take, 1, MaxTake);
        var items = await _history.ListByUserAsync(userId, limit, cancellationToken).ConfigureAwait(false);
        return items.Select(ToResponse).ToList();
    }

    private string RequireUserId()
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUser.UserId))
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        return _currentUser.UserId;
    }

    private static PlayHistoryDocument NewDocument(
        string userId,
        string goduId,
        string title,
        string? creatorDisplayName,
        string playPath,
        string source,
        DateTime now) =>
        new()
        {
            Id = IdGenerator.PlayHistoryId(userId, goduId),
            UserId = userId,
            GoduId = goduId,
            Title = title,
            CreatorDisplayName = string.IsNullOrWhiteSpace(creatorDisplayName)
                ? null
                : creatorDisplayName.Trim(),
            PlayPath = playPath,
            Source = source,
            StartedCount = 0,
            CompletedCount = 0,
            LastStartedUtc = now,
            CreatedUtc = now,
            UpdatedUtc = now,
        };

    private static PlayHistoryResponse ToResponse(PlayHistoryDocument document) =>
        new()
        {
            GoduId = document.GoduId,
            Title = document.Title,
            CreatorDisplayName = document.CreatorDisplayName,
            PlayPath = document.PlayPath,
            Source = document.Source,
            StartedCount = document.StartedCount,
            CompletedCount = document.CompletedCount,
            LastStartedUtc = document.LastStartedUtc,
            LastCompletedUtc = document.LastCompletedUtc,
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

    private static string NormalisePlayPath(string? playPath)
    {
        var path = RequireToken(playPath, "Play path is required.");
        if (!path.StartsWith('/') || path.StartsWith("//", StringComparison.Ordinal))
        {
            throw new ArgumentException("Play path must be a site-relative URL.");
        }

        return path;
    }

    private static string RequireSource(string? source)
    {
        var value = RequireToken(source, "Source is required.").ToLowerInvariant();
        if (!PlayHistorySources.IsKnown(value))
        {
            throw new ArgumentException("Source must be public, library, or demo.");
        }

        return value;
    }

    private static string RequireEvent(string? eventName)
    {
        var value = RequireToken(eventName, "Event is required.").ToLowerInvariant();
        if (!PlayHistoryEvents.IsKnown(value))
        {
            throw new ArgumentException("Event must be started or completed.");
        }

        return value;
    }
}
