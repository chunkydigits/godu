using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class PublishStepsItemRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(80)]
    public required string Slug { get; set; }

    /// <summary>
    /// Optional. When omitted, the verified TikTok account that matches the
    /// video's creator handle is used, or the user's only verified TikTok account.
    /// </summary>
    public string? LinkedPlatformAccountId { get; set; }
}
