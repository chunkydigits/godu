using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Godu.Model.Requests;

public sealed class IngestAnalyticsEventRequest
{
    [Required]
    [MaxLength(80)]
    public string EventName { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string AnonymousId { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string SessionId { get; set; } = string.Empty;

    [MaxLength(80)]
    public string? GoduId { get; set; }

    [MaxLength(40)]
    public string? Platform { get; set; }

    [MaxLength(80)]
    public string? SourceCreatorHandle { get; set; }

    [MaxLength(2048)]
    public string? Referrer { get; set; }

    [MaxLength(512)]
    public string? Path { get; set; }

    public Dictionary<string, JsonElement>? Properties { get; set; }
}
