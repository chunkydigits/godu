namespace Godu.Model.Documents;

public sealed class ProfileLinkDocument
{
    public required string Id { get; init; }
    public required string Title { get; set; }
    public required string Url { get; set; }
    public int Order { get; set; }
}
