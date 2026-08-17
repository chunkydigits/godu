using Godu.Service.TikTok;
using FluentAssertions;

namespace Godu.Service.Tests.TikTok;

public sealed class TikTokOEmbedServiceTests
{
    [Theory]
    [InlineData("https://www.tiktok.com/@louishowardpt/video/7604926983998344470", true)]
    [InlineData("https://tiktok.com/@user/video/12345678901", true)]
    [InlineData("7604926983998344470", true)]
    [InlineData("https://evil.example/video/123", false)]
    [InlineData("not-a-url", false)]
    public void TryNormaliseTikTokVideoUrl_WhenInputProvided_ThenValidatesHostAndPath(
        string input,
        bool expected)
    {
        var ok = TikTokOEmbedService.TryNormaliseTikTokVideoUrl(input, out var sourceUrl);

        ok.Should().Be(expected);
        if (expected)
        {
            sourceUrl.Should().Contain("/video/");
            sourceUrl.Should().StartWith("https://www.tiktok.com/");
        }
    }
}
