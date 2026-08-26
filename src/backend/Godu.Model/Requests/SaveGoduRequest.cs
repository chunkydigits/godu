using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed record SaveGoduRequest
{
    [Required]
    [StringLength(80)]
    public required string GoduId { get; init; }

    [Required]
    [StringLength(200)]
    public required string Title { get; init; }

    [StringLength(80)]
    public string? CreatorDisplayName { get; init; }

    [Required]
    [StringLength(300)]
    public required string PlayPath { get; init; }

    [StringLength(40)]
    public string? Category { get; init; }
}
