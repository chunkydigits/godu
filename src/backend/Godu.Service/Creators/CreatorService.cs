using Godu.Model.Documents;
using Godu.Repository.Creators;
using Godu.Utility;

namespace Godu.Service.Creators;

public sealed class CreatorService : ICreatorService
{
    private readonly ICreatorRepository _repository;

    public CreatorService(ICreatorRepository repository)
    {
        _repository = repository;
    }

    public async Task<CreatorDocument> EnsureForUserAsync(
        string userId,
        string displayName,
        string? profileImageUrl,
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
                    ProfileImageUrl = string.IsNullOrWhiteSpace(profileImageUrl) ? null : profileImageUrl,
                    CreatedUtc = now,
                    UpdatedUtc = now,
                },
                cancellationToken)
            .ConfigureAwait(false);
    }
}
