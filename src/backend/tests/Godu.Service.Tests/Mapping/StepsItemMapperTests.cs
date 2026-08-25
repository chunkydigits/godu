using FluentAssertions;
using Godu.Model.Documents;
using Godu.Model.Requests;
using Godu.Service.Mapping;

namespace Godu.Service.Tests.Mapping;

public sealed class StepsItemMapperTests
{
    [Fact]
    public void ToStepDocuments_WhenCard_ThenKeepsColourAndStill()
    {
        var steps = StepsItemMapper.ToStepDocuments(
        [
            new StepDefinitionRequest
            {
                Order = 1,
                Kind = "card",
                DurationSeconds = 40,
                Message = "  Rest  ",
                BackgroundColor = "#02c998",
                TextColor = "#002116",
                StillSeconds = 8,
            },
        ]);

        var card = steps.Should().ContainSingle().Subject;
        card.Kind.Should().Be("card");
        card.DurationSeconds.Should().Be(40);
        card.Message.Should().Be("Rest");
        card.BackgroundColor.Should().Be("#02C998");
        card.TextColor.Should().Be("#002116");
        card.StillSeconds.Should().Be(8);
        card.StartSeconds.Should().Be(0);
        card.EndSeconds.Should().Be(0);
    }

    [Fact]
    public void ToVideoDocument_WhenVideoOff_ThenPersistsPlaceholder()
    {
        var video = StepsItemMapper.ToVideoDocument(
            new VideoReferenceRequest
            {
                Provider = "tiktok",
                ExternalVideoId = "123",
                SourceUrl = "https://www.tiktok.com/@x/video/123",
            },
            useVideoContent: false);

        video.Provider.Should().Be("none");
        video.ExternalVideoId.Should().BeEmpty();
        video.SourceUrl.Should().BeEmpty();
        StepsItemMapper.UsesVideoContent(new StepsItemDocument
        {
            Id = "steps_1",
            CreatedByUserId = "usr_1",
            Visibility = "private",
            Status = "published",
            Title = "Cards",
            UseVideoContent = false,
            Video = video,
            Steps = [],
        }).Should().BeFalse();
    }
}
