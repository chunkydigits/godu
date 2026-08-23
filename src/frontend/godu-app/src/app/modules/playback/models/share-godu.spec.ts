import { describe, expect, it } from 'vitest';
import { shareableGoduUrl } from './share-godu';

describe('shareableGoduUrl', () => {
  it('prefers the stored public path', () => {
    expect(
      shareableGoduUrl({
        id: 'steps_1',
        title: 'Circuit',
        publicPath: '/t/coach/circuit',
      }),
    ).toMatch(/\/t\/coach\/circuit$/);
  });

  it('falls back to the private play path', () => {
    expect(shareableGoduUrl({ id: 'steps_1', title: 'Circuit' })).toMatch(
      /\/play\/steps_1$/,
    );
  });
});
