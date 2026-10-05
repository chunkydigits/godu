using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class CreateProfileLinkRequest
{
    [Required, MaxLength(100)] public string? Title { get; set; }
    [Required, MaxLength(2048), Url] public string? Url { get; set; }
}
