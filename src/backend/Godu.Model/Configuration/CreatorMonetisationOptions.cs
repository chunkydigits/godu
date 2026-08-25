namespace Godu.Model.Configuration;

public sealed class CreatorMonetisationOptions
{
    public const string SectionName = "CreatorMonetisation";

    public decimal MonthlyPriceGbp { get; set; } = 9.99m;
}
