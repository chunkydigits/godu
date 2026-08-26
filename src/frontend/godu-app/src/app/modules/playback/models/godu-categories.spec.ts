import { describe, expect, it } from 'vitest';
import { PRESET_GODU_CATEGORIES, mergeGoduCategories, normaliseCategoryName } from './godu-categories';

describe('godu categories', () => {
  it('keeps demo presets first and appends custom names', () => {
    expect(mergeGoduCategories(PRESET_GODU_CATEGORIES, ['Morning', 'Cook', '  '])).toEqual([
      ...PRESET_GODU_CATEGORIES,
      'Morning',
    ]);
  });

  it('treats custom names as case-insensitive duplicates of presets', () => {
    expect(mergeGoduCategories(['Train'], ['train', 'TRAIN'])).toEqual(['Train']);
  });

  it('trims and caps category names', () => {
    expect(normaliseCategoryName('  Morning  ')).toBe('Morning');
    expect(normaliseCategoryName('   ')).toBeNull();
    expect(normaliseCategoryName('x'.repeat(45))?.length).toBe(40);
  });
});
