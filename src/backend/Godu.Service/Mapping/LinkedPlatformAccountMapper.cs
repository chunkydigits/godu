using Godu.Model.Documents;
using Godu.Model.Responses;

namespace Godu.Service.Mapping;

public static class LinkedPlatformAccountMapper
{
    public static LinkedPlatformAccountResponse ToResponse(LinkedPlatformAccountDocument document)
    {
        return new LinkedPlatformAccountResponse
        {
            Id = document.Id,
            UserId = document.UserId,
            Provider = document.Provider,
            ExternalAccountId = document.ExternalAccountId,
            Username = document.Username,
            DisplayName = document.DisplayName,
            ProfileUrl = document.ProfileUrl,
            AvatarUrl = document.AvatarUrl,
            Bio = document.Bio,
            UsernameAliases = document.UsernameAliases ?? [],
            IsVerified = document.IsVerified,
            VerifiedUtc = document.VerifiedUtc,
            CreatedUtc = document.CreatedUtc,
            UpdatedUtc = document.UpdatedUtc,
        };
    }
}
