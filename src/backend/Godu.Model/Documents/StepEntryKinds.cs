namespace Godu.Model.Documents;

/// <summary>
/// Kinds of entry a Steps item can contain. New kinds need a constant here plus
/// handling in <c>StepDefinitionValidator</c> and the client playback engine.
/// </summary>
public static class StepEntryKinds
{
    public const string Step = "step";

    public const string Gap = "gap";

    public const int GapSecondsMin = 1;

    public const int GapSecondsMax = 600;

    public const int GapMessageMaxLength = 256;

    /// <summary>Entries with no kind predate gaps and are activity steps.</summary>
    public static string Normalise(string? kind)
    {
        var value = kind?.Trim().ToLowerInvariant();
        return value == Gap ? Gap : Step;
    }

    public static bool IsGap(string? kind) => Normalise(kind) == Gap;

    public static bool IsKnown(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind))
        {
            return true;
        }

        var value = kind.Trim().ToLowerInvariant();
        return value is Step or Gap;
    }
}
