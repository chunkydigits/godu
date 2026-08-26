export const PRESET_GODU_CATEGORIES = [
  'Cook',
  'Train',
  'Style',
  'Dance',
  'Makeup',
  'Fix',
  'Make',
  'Play',
  'Care',
  'Learn',
  'Fitness',
  'Cooking',
] as const;

export type PresetGoduCategory = (typeof PRESET_GODU_CATEGORIES)[number];

export function mergeGoduCategories(
  presets: readonly string[],
  custom: readonly (string | null | undefined)[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of [...presets, ...custom]) {
    const trimmed = name?.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function normaliseCategoryName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 40);
}
