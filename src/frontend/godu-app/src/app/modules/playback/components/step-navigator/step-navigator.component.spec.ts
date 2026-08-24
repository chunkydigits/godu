import { describe, expect, it } from 'vitest';
import { StepDefinition } from '../../models/step-definition.model';
import { StepNavigatorComponent } from './step-navigator.component';

function step(id: string): StepDefinition {
  return {
    id,
    order: 1,
    title: id,
    startSeconds: 0,
    endSeconds: 5,
    durationSeconds: 10,
    autoAdvance: true,
  };
}

describe('StepNavigatorComponent', () => {
  it('keeps next enabled on the last step when wrapping is allowed', () => {
    const nav = new StepNavigatorComponent();
    nav.steps = [step('a'), step('b')];
    nav.selectedIndex = 1;
    nav.allowWrapNext = true;

    expect(nav.atEnd).toBe(false);

    let wrapped = false;
    nav.wrapNext.subscribe(() => {
      wrapped = true;
    });
    nav.next();
    expect(wrapped).toBe(true);
  });

  it('keeps previous enabled on the first step when rewinding a round is allowed', () => {
    const nav = new StepNavigatorComponent();
    nav.steps = [step('a'), step('b')];
    nav.selectedIndex = 0;
    nav.allowWrapPrevious = true;

    expect(nav.atStart).toBe(false);

    let wrapped = false;
    nav.wrapPrevious.subscribe(() => {
      wrapped = true;
    });
    nav.previous();
    expect(wrapped).toBe(true);
  });

  it('still disables next on the last step of a single pass', () => {
    const nav = new StepNavigatorComponent();
    nav.steps = [step('a'), step('b')];
    nav.selectedIndex = 1;

    expect(nav.atEnd).toBe(true);
    let wrapped = false;
    nav.wrapNext.subscribe(() => {
      wrapped = true;
    });
    nav.next();
    expect(wrapped).toBe(false);
  });
});
