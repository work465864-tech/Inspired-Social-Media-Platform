import { describe, expect, it } from 'vitest';
import { getSwipeDirection, getWheelDirection } from './gestureUtils';

describe('feed gesture direction', () => {
  it('navigates only when vertical swipes cross the distance threshold', () => {
    expect(getSwipeDirection(180, 120)).toBe('next');
    expect(getSwipeDirection(120, 180)).toBe('previous');
    expect(getSwipeDirection(120, 80)).toBeNull();
  });

  it('ignores small and predominantly horizontal wheel input', () => {
    expect(getWheelDirection(80, 10)).toBe('next');
    expect(getWheelDirection(-80, 10)).toBe('previous');
    expect(getWheelDirection(30, 0)).toBeNull();
    expect(getWheelDirection(60, 90)).toBeNull();
  });
});
