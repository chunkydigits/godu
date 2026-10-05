using FluentAssertions;
using Godu.Utility;

namespace Godu.Service.Tests.Utility;

public sealed class QueryStringUtilitiesTests
{
    [Fact]
    public void GetUnescapedValue_WhenPlusInValue_ThenKeepsPlus()
    {
        var value = QueryStringUtilities.GetUnescapedValue("?code=abc+def&state=s", "code");

        value.Should().Be("abc+def");
    }

    [Fact]
    public void GetUnescapedValue_WhenPercentEncodedPlus_ThenDecodesToPlus()
    {
        var value = QueryStringUtilities.GetUnescapedValue("?code=abc%2Bdef", "code");

        value.Should().Be("abc+def");
    }
}
