import { environment } from '../../../../environments/environment';
import { GAP_MESSAGE_MAX_LENGTH, GAP_SECONDS_MAX, GAP_SECONDS_MIN, CARD_SECONDS_MAX } from './step-entry';

/** Collapsible groups of fields on the Godu editor page. */
export type EditorSectionId = 'video' | 'gaps' | 'repeat' | 'steps';

export interface EditorSection {
  id: EditorSectionId;
  label: string;
  /** Controls the section owns, so collapsing can never hide a validation error. */
  controls: readonly string[];
  /** Shown when the section's info button is pressed. */
  tips: readonly string[];
}

const immediateGapSeconds = environment.playback.gapPrerollImmediateMaxSeconds;
const prerollLeadSeconds = environment.playback.gapPrerollLeadSeconds;
const goCueMaxSeconds = environment.playback.gapGoCueMaxSeconds;

export const EDITOR_SECTIONS = {
  video: {
    id: 'video',
    label: 'Video and Creator',
    controls: [
      'noVideoContent',
      'videoInput',
      'title',
      'description',
      'creatorDisplayName',
      'continuousSoundtrack',
    ],
    tips: [
      'Paste a TikTok link or a bare video ID — including mobile share links like vm.tiktok.com. Creator, title and description autofill from TikTok where it allows it. Title and description you have typed yourself are left alone.',
      'Tick Don’t use video content for a cards-only Godu. The URL is then optional, steps are hidden, and cards cannot freeze a TikTok still. Card-only Godus can be published and shared.',
      'Title and description are what people see in listings and above the player.',
      'Creator display name is locked to the TikTok handle once the video is imported, so the original creator stays credited.',
    ],
  },
  gaps: {
    id: 'gaps',
    label: 'Gap configuration',
    controls: [
      'noGaps',
      'playGapPriorToStart',
      'overrideStartGap',
      'startGapSeconds',
      'startGapMessage',
      'gapSeconds',
      'gapMessage',
    ],
    tips: [
      'A gap is a rest that counts down before the next step starts. Set one here and it applies between every step.',
      'Play gap prior to start uses that same gap as a demo before the first timer. It needs a TikTok, so it is hidden on cards-only Godus.',
      'Override start gap if the demo needs a different length or message. Leave it off to reuse the gap below.',
      'Tick No gaps to run every step back to back, with no rest between the end of one step and the start of the next. Gap entries you have added in the Godu still play.',
      `Add a Gap entry in the Godu to override this default at a single point. Consecutive gap entries add together, and a gap after the last step is ignored. Either way a gap runs ${GAP_SECONDS_MIN}–${GAP_SECONDS_MAX} seconds.`,
      `Gaps of ${immediateGapSeconds} seconds or less keep the next clip playing throughout the rest. Longer gaps hold the video and start it ${prerollLeadSeconds} seconds before the gap ends.`,
      `With voice cues on, a gap announces the next step as it begins and says “Go” as the timer starts. Gaps under ${goCueMaxSeconds} seconds only say “Go”.`,
      `The message shows on screen while the gap counts down — up to ${GAP_MESSAGE_MAX_LENGTH} characters, or leave it blank for just the countdown.`,
    ],
  },
  repeat: {
    id: 'repeat',
    label: 'Repeat configuration',
    controls: ['repeatVideo', 'repeatCount'],
    tips: [
      'Tick this when the whole Godu is one round that should be done several times, such as a fitness set you repeat until the workout is complete. This is separate from looping a step clip for the set duration.',
      'How many times is the number of full passes, including the first. Playback shows which iteration you are on.',
    ],
  },
  steps: {
    id: 'steps',
    label: 'Steps',
    controls: ['steps'],
    tips: [
      'Each step loops a slice of the video: Start and End trim the clip, Duration is how long the set / step runs.',
      `A card is a timed countdown with a comment, from ${GAP_SECONDS_MIN} seconds up to ${CARD_SECONDS_MAX / 60} minutes. It can fill the screen in Godu colours, or freeze a still from the TikTok when video is on.`,
      'Loop repeats that clip while the step is active. Play once plays it once. Repeating the whole Godu (sets of the workout) is configured under Repeat configuration, not here.',
      'Leave Duration blank for an untimed step that waits for you to move on. Untimed play-once holds the step name and description on screen until Next.',
      'Turn on Auto-advance to roll straight into the next step when the timer ends.',
      'The summary line shows the clip window, the length, a loop or play-once symbol, and a fast-forward symbol when the step auto-advances.',
      'Use the arrow beside Add step to insert a card or a gap. Gaps sit between steps and are not numbered. Cards are numbered with steps.',
      'Drag the handle to reorder, and tap a summary line to fold a step away.',
    ],
  },
} as const satisfies Record<EditorSectionId, EditorSection>;

/** Appended to the video tips only when the dual-embed feature is enabled. */
export const CONTINUOUS_SOUNDTRACK_TIP =
  'Continuous soundtrack plays the video audio unbroken across timed steps while the clips themselves stay muted.';
