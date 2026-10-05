namespace Godu.Model.Configuration;

public sealed class ProfileOptions
{
    public const string SectionName = "Profile";
    public int MaxExternalLinks { get; set; } = 10;
    public int ExternalLinkTitleMaxLength { get; set; } = 100;
    public int ExternalLinkUrlMaxLength { get; set; } = 2_048;
}
