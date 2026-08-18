import { environment } from '../../../../environments/environment';
import { GAP_MESSAGE_MAX_LENGTH, GAP_SECONDS_MAX, GAP_SECONDS_MIN } from './step-entry';

/** Collapsible groups of fields on the Steps editor page. */
export type EditorSectionId = 'video' | 'gaps' | 'steps';

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
      'videoInput',
      'title',
      'description',
      'creatorDisplayName',
      'continuousSoundtrack',
    ],
    tips: [
      'Paste a TikTok link or a bare video ID. Creator, title and description autofill from TikTok where it allows it, and anything you have typed yourself is left alone.',
      'Title and description are what people see in listings and above the player.',
      'Creator display name credits the original creator and becomes the profile link in the player header, so keep it as their TikTok handle.',
    ],
  },
  gaps: {
    id: 'gaps',
    label: 'Gap configuration',
    controls: ['noGaps', 'gapSeconds', 'gapMessage'],
    tips: [
      'A gap is a rest that counts down before the next step starts. Set one here and it applies between every step.',
      'Tick No gaps to run every step back to back. Gap entries you have added in Steps still play.',
      `Add a Gap entry in Steps to override this default at a single point. Consecutive gap entries add together, and a gap after the last step is ignored. Either way a gap runs ${GAP_SECONDS_MIN}–${GAP_SECONDS_MAX} seconds.`,
      `Gaps of ${immediateGapSeconds} seconds or less keep the next clip playing throughout the rest. Longer gaps hold the video and start it ${prerollLeadSeconds} seconds before the gap ends.`,
      `With voice cues on, a gap announces the next step as it begins and says “Go” as the timer starts. Gaps under ${goCueMaxSeconds} seconds only say “Go”.`,
      `The message shows on screen while the gap counts down — up to ${GAP_MESSAGE_MAX_LENGTH} characters, or leave it blank for just the countdown.`,
    ],
  },
  steps: {
    id: 'steps',
    label: 'Steps',
    controls: ['steps'],
    tips: [
      'Each step loops a slice of the video: Start and End trim the clip, Duration is how long the step runs.',
      'Leave Duration blank for an untimed step that waits for you to move on, and turn on Auto-advance to roll straight into the next step when the timer ends.',
      'The summary line shows the clip window, the length, and a fast-forward symbol when the step auto-advances.',
      'Use the arrow beside Add step to insert a gap. Gaps sit between steps and are not numbered.',
      'Drag the handle to reorder, and tap a summary line to fold a step away.',
    ],
  },
} as const satisfies Record<EditorSectionId, EditorSection>;

/** Appended to the video tips only when the dual-embed feature is enabled. */
export const CONTINUOUS_SOUNDTRACK_TIP =
  'Continuous soundtrack plays the video audio unbroken across timed steps while the clips themselves stay muted.';
