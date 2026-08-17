namespace Godu.Model.Documents;

public sealed class ExternalIdentityDocument
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string IdentityProvider { get; init; }

    public required string ExternalSubjectId { get; init; }

    public DateTime CreatedUtc { get; init; }
}
