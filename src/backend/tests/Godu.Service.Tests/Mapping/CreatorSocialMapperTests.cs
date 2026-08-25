using FluentAssertions;
using Godu.Model.Documents;
using Godu.Service.Mapping;

namespace Godu.Service.Tests.Mapping;

public sealed class CreatorSocialMapperTests
{
    [Fact]
    public void Combine_WhenOwnerTikTokDiffersFromVideo_ThenUsesVideoCreator()
    {
        var socials = CreatorSocialMapper.Combine(
            [Account("myhandle")],
            Video("lagomchef"));

        socials.Should().ContainSingle();
        socials[0].Username.Should().Be("lagomchef");
        socials[0].ProfileUrl.Should().Be("https://www.tiktok.com/@lagomchef");
    }

    [Fact]
    public void Combine_WhenLinkedAccountMatchesVideo_ThenUsesCurrentHandle()
    {
        var account = Account("coach");
        account.UsernameAliases.Add("oldcoach");

        var socials = CreatorSocialMapper.Combine([account], Video("oldcoach"));

        socials.Should().ContainSingle();
        socials[0].Username.Should().Be("coach");
        socials[0].ProfileUrl.Should().Be("https://www.tiktok.com/@coach");
    }

    [Fact]
    public void Combine_WhenNoVideo_ThenReturnsOwnerAccounts()
    {
        var socials = CreatorSocialMapper.Combine([Account("myhandle")]);

        socials.Should().ContainSingle();
        socials[0].Username.Should().Be("myhandle");
    }

    private static LinkedPlatformAccountDocument Account(string username) =>
        new()
        {
            Id = "platform_1",
            UserId = "usr_owner",
            Provider = "tiktok",
            ExternalAccountId = "oid_owner",
            Username = username,
            IsVerified = true,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
        };

    private static VideoReferenceDocument Video(string username) =>
        new()
        {
            Provider = "tiktok",
            ExternalVideoId = "123",
            SourceUrl = $"https://www.tiktok.com/@{username}/video/123",
            CreatorUsername = username,
        };
}
