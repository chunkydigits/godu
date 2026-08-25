import { describe, expect, it } from 'vitest';
import { buildEditorCardPreview } from './editor-card-preview';

describe('buildEditorCardPreview', () => {
  it('builds a live colour card from the selected entry', () => {
    const preview = buildEditorCardPreview(
      [
        {
          kind: 'card',
          durationSeconds: 90,
          message: 'Hold',
          backgroundColor: '#112233',
          textColor: '#ffffff',
        },
      ],
      0,
    );

    expect(preview?.upNext).toBe(false);
    expect(preview?.remainingSeconds).toBe(90);
    expect(preview?.card).toMatchObject({
      kind: 'card',
      message: 'Hold',
      backgroundColor: '#112233',
      textColor: '#ffffff',
      durationSeconds: 90,
    });
  });

  it('shows the next card as up next when a gap is selected', () => {
    const preview = buildEditorCardPreview(
      [
        { kind: 'gap', durationSeconds: 10, message: 'Breathe' },
        { kind: 'card', durationSeconds: 30, message: 'Next hold', backgroundColor: '#02c998' },
      ],
      0,
    );

    expect(preview?.upNext).toBe(true);
    expect(preview?.gapMessage).toBe('Breathe');
    expect(preview?.gapSeconds).toBe(10);
    expect(preview?.remainingSeconds).toBeNull();
    expect(preview?.card?.message).toBe('Next hold');
  });

  it('does not preview a video step', () => {
    expect(
      buildEditorCardPreview([{ kind: 'step', title: 'Squat', startSeconds: 0, endSeconds: 5 }], 0),
    ).toBeNull();
  });
});
