using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class UpdateCreatorProfileRequest
{
    public const int ProfileImageMaxLength = 100_000;

    [MaxLength(80)]
    public string? DisplayName { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    [MaxLength(ProfileImageMaxLength)]
    public string? ProfileImageUrl { get; set; }
}
