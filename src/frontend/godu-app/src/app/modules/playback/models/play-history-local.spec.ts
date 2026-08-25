import { afterEach, describe, expect, it } from 'vitest';
import { GODU_PLAY_HISTORY_KEY, loadLocalPlayHistory, upsertLocalPlayHistory } from './play-history-local';
import { RecordPlayHistoryRequest } from './play-history.model';

describe('local play history', () => {
  afterEach(() => {
    window.localStorage.removeItem(GODU_PLAY_HISTORY_KEY);
  });

  it('stores the last completed session and keeps it after a later start', () => {
    upsertLocalPlayHistory(request('started'), '2026-08-25T10:00:00Z');
    upsertLocalPlayHistory(
      {
        ...request('completed'),
        stepCount: 5,
        iterationCount: 7,
        elapsedSeconds: 94,
      },
      '2026-08-25T10:02:00Z',
    );
    upsertLocalPlayHistory(request('started'), '2026-08-25T10:05:00Z');

    const stored = loadLocalPlayHistory();
    expect(stored).toHaveLength(1);
    expect(stored[0].completedCount).toBe(1);
    expect(stored[0].startedCount).toBe(2);
    expect(stored[0].lastStepCount).toBe(5);
    expect(stored[0].lastIterationCount).toBe(7);
    expect(stored[0].lastElapsedSeconds).toBe(94);
  });
});

function request(event: 'started' | 'completed'): RecordPlayHistoryRequest {
  return {
    goduId: 'steps_1',
    title: 'HIIT',
    playPath: '/play/steps_1',
    source: 'demo',
    event,
  };
}
