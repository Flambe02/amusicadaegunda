import { beforeEach, describe, expect, it } from 'vitest';
import { HOME_HINT_LAUNCHES, shouldShowHomeHint } from '../homeHintPref';

describe('homeHintPref', () => {
  beforeEach(() => localStorage.clear());

  it('shows the hint on the first launches only', () => {
    for (let launch = 0; launch < HOME_HINT_LAUNCHES; launch += 1) expect(shouldShowHomeHint()).toBe(true);
    expect(shouldShowHomeHint()).toBe(false);
    expect(shouldShowHomeHint()).toBe(false);
  });
});
