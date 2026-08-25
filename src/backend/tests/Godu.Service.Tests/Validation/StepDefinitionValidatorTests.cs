using FluentAssertions;
using Godu.Model.Requests;
using Godu.Service.Validation;

namespace Godu.Service.Tests.Validation;

public sealed class StepDefinitionValidatorTests
{
    [Fact]
    public void Validate_WhenCardWithDuration_ThenAccepts()
    {
        var errors = StepDefinitionValidator.Validate(
            [
                new StepDefinitionRequest
                {
                    Order = 1,
                    Kind = "card",
                    DurationSeconds = 45,
                    Message = "Hold",
                    BackgroundColor = "#02c998",
                    TextColor = "#002116",
                },
            ],
            useVideoContent: false);

        errors.Should().BeEmpty();
    }

    [Fact]
    public void Validate_WhenStillWithoutVideo_ThenRejects()
    {
        var errors = StepDefinitionValidator.Validate(
            [
                new StepDefinitionRequest
                {
                    Order = 1,
                    Kind = "card",
                    DurationSeconds = 20,
                    StillSeconds = 3,
                },
            ],
            useVideoContent: false);

        errors.Should().ContainSingle(e => e.Contains("a still needs a TikTok"));
    }

    [Fact]
    public void Validate_WhenStepWithoutVideo_ThenRejects()
    {
        var errors = StepDefinitionValidator.Validate(
            [
                new StepDefinitionRequest
                {
                    Order = 1,
                    Kind = "step",
                    Title = "Squat",
                    StartSeconds = 0,
                    EndSeconds = 5,
                },
            ],
            useVideoContent: false);

        errors.Should().ContainSingle(e => e.Contains("video steps need a TikTok"));
    }

    [Fact]
    public void Validate_WhenOnlyCards_ThenDoesNotRequireAStep()
    {
        var errors = StepDefinitionValidator.Validate(
            [
                new StepDefinitionRequest { Order = 1, Kind = "gap", DurationSeconds = 10 },
                new StepDefinitionRequest { Order = 2, Kind = "card", DurationSeconds = 30 },
            ],
            useVideoContent: false);

        errors.Should().BeEmpty();
    }
}
