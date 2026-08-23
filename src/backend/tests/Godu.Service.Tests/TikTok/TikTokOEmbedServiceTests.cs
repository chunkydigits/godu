using Godu.Service.TikTok;
using FluentAssertions;

namespace Godu.Service.Tests.TikTok;

public sealed class TikTokOEmbedServiceTests
{
    [Theory]
    [InlineData("https://www.tiktok.com/@louishowardpt/video/7604926983998344470", true)]
    [InlineData("https://tiktok.com/@user/video/12345678901", true)]
    [InlineData("7604926983998344470", true)]
    [InlineData("https://vm.tiktok.com/ZN8Nemy3d/", true)]
    [InlineData("https://vm.tiktok.com/ZN8Nemy3d", true)]
    [InlineData("https://vt.tiktok.com/ZSabc123/", true)]
    [InlineData("https://www.tiktok.com/t/ZT9xyz", true)]
    [InlineData("https://evil.example/video/123", false)]
    [InlineData("https://vm.tiktok.com/", false)]
    [InlineData("not-a-url", false)]
    public void TryNormaliseTikTokVideoUrl_WhenInputProvided_ThenValidatesHostAndPath(
        string input,
        bool expected)
    {
        var ok = TikTokOEmbedService.TryNormaliseTikTokVideoUrl(input, out var sourceUrl);

        ok.Should().Be(expected);
        if (expected)
        {
            sourceUrl.Should().StartWith("https://");
            sourceUrl.Should().Contain("tiktok.com/");
        }
    }

    [Fact]
    public void TryNormaliseTikTokVideoUrl_WhenMobileShareLink_ThenKeepsShortUrlForOEmbed()
    {
        var ok = TikTokOEmbedService.TryNormaliseTikTokVideoUrl(
            "https://vm.tiktok.com/ZN8Nemy3d/",
            out var sourceUrl);

        ok.Should().BeTrue();
        sourceUrl.Should().Be("https://vm.tiktok.com/ZN8Nemy3d/");
    }

    [Fact]
    public void CanonicalWatchUrl_WhenUsernameMissing_ThenUsesVideoPlaceholder()
    {
        TikTokOEmbedService.CanonicalWatchUrl("7667587928620600609", "lagomchef")
            .Should()
            .Be("https://www.tiktok.com/@lagomchef/video/7667587928620600609");
        TikTokOEmbedService.CanonicalWatchUrl("7667587928620600609", null)
            .Should()
            .Be("https://www.tiktok.com/@video/video/7667587928620600609");
    }
}
