import { describe, expect, it } from 'vitest';
import { DurationInputComponent } from './duration-input.component';

function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('DurationInputComponent', () => {
  it('keeps the stored value in seconds and can toggle minutes and seconds', () => {
    const input = new DurationInputComponent();
    const values: Array<number | null> = [];
    input.registerOnChange((value) => values.push(value));

    input.writeValue(90);
    expect(input.split).toBe(true);
    expect(input.minutesText).toBe('1');
    expect(input.secondsPartText).toBe('30');

    input.onMinutesInput(inputEvent('2'));
    expect(values.at(-1)).toBe(150);

    input.toggleSplit();
    expect(input.split).toBe(false);
    expect(input.secondsText).toBe('150');

    input.onSecondsInput(inputEvent('45'));
    expect(values.at(-1)).toBe(45);
  });

  it('stores null when empty is allowed', () => {
    const input = new DurationInputComponent();
    input.allowEmpty = true;
    let value: number | null = 12;
    input.registerOnChange((next) => {
      value = next;
    });
    input.writeValue(null);
    input.onSecondsInput(inputEvent(''));
    expect(value).toBeNull();
  });
});
