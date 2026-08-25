import { describe, expect, it } from 'vitest';
import { mapEditorEntryToApiStep } from './editor-entry-request';

describe('mapEditorEntryToApiStep', () => {
  it('maps a colour card and drops leftover steps when video is off', () => {
    const card = mapEditorEntryToApiStep(
      {
        kind: 'card',
        durationSeconds: 45,
        message: '  Hold  ',
        backgroundColor: '#02c998',
        textColor: '#002116',
        useStill: true,
        stillSeconds: 4,
      },
      0,
      false,
    );

    expect(card).toMatchObject({
      kind: 'card',
      durationSeconds: 45,
      message: 'Hold',
      backgroundColor: '#02C998',
      textColor: '#002116',
      stillSeconds: null,
    });

    expect(
      mapEditorEntryToApiStep(
        { kind: 'step', title: 'Squat', startSeconds: 0, endSeconds: 5 },
        1,
        false,
      ),
    ).toBeNull();
  });

  it('keeps a still timestamp when video is on', () => {
    const card = mapEditorEntryToApiStep(
      {
        kind: 'card',
        durationSeconds: 20,
        useStill: true,
        stillSeconds: 6,
      },
      0,
      true,
    );

    expect(card?.stillSeconds).toBe(6);
  });

  it('keeps a 60-minute card as 3600 seconds', () => {
    const card = mapEditorEntryToApiStep(
      {
        kind: 'card',
        durationSeconds: 3600,
      },
      0,
      false,
    );

    expect(card?.durationSeconds).toBe(3600);
  });
});
