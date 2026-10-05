using System.ComponentModel.DataAnnotations;

namespace Godu.Model.Requests;

public sealed class UpdateProfileLinkOrderRequest
{
    [Required] public IReadOnlyList<string>? LinkIds { get; set; }
}
