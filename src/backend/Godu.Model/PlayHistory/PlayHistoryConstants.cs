namespace Godu.Model.PlayHistory;

public static class PlayHistorySources
{
    public const string Public = "public";
    public const string Library = "library";
    public const string Demo = "demo";

    public static bool IsKnown(string? source) =>
        source is Public or Library or Demo;
}

public static class PlayHistoryEvents
{
    public const string Started = "started";
    public const string Completed = "completed";

    public static bool IsKnown(string? value) =>
        value is Started or Completed;
}
