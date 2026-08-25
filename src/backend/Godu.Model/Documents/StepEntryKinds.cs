using System.Text.RegularExpressions;

namespace Godu.Model.Documents;

/// <summary>
/// Kinds of entry a Steps item can contain. New kinds need a constant here plus
/// handling in <c>StepDefinitionValidator</c> and the client playback engine.
/// </summary>
public static class StepEntryKinds
{
    public const string Step = "step";

    public const string Gap = "gap";

    public const string Card = "card";

    public const int GapSecondsMin = 1;

    public const int GapSecondsMax = 600;

    public const int GapMessageMaxLength = 256;

    public const string DefaultCardBackground = "#02c998";

    public const string DefaultCardText = "#002116";

    private static readonly Regex HexColour = new(
        "^#[0-9A-Fa-f]{6}$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    /// <summary>Entries with no kind predate gaps and are activity steps.</summary>
    public static string Normalise(string? kind)
    {
        var value = kind?.Trim().ToLowerInvariant();
        return value switch
        {
            Gap => Gap,
            Card => Card,
            _ => Step,
        };
    }

    public static bool IsGap(string? kind) => Normalise(kind) == Gap;

    public static bool IsCard(string? kind) => Normalise(kind) == Card;

    public static bool IsActivity(string? kind) => !IsGap(kind);

    public static bool IsKnown(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind))
        {
            return true;
        }

        var value = kind.Trim().ToLowerInvariant();
        return value is Step or Gap or Card;
    }

    public static bool IsHexColour(string? value) =>
        !string.IsNullOrWhiteSpace(value) && HexColour.IsMatch(value.Trim());

    public static string NormaliseColour(string? value, string fallback)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed) || !HexColour.IsMatch(trimmed))
        {
            return fallback;
        }

        return "#" + trimmed[1..].ToUpperInvariant();
    }

    public static string? TrimMessage(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
