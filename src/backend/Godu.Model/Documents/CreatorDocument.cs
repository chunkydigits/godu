namespace Godu.Model.Documents;

public sealed class CreatorDocument
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string DisplayName { get; set; }

    public string? Bio { get; set; }

    public string? ProfileImageUrl { get; set; }

    public DateTime CreatedUtc { get; init; }

    public DateTime UpdatedUtc { get; set; }
}
