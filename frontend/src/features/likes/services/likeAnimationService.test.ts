import { describe, expect, it } from 'vitest';
import { LikeAnimationService } from './likeAnimationService';

describe('LikeAnimationService', () => {
  const service = new LikeAnimationService();

  it('detects a second tap only within the timing and distance thresholds', () => {
    const previous = { x: 20, y: 30, time: 100 };
    expect(service.isDoubleTap(previous, { x: 40, y: 40, time: 300 })).toBe(
      true,
    );
    expect(service.isDoubleTap(previous, { x: 80, y: 30, time: 300 })).toBe(
      false,
    );
    expect(service.isDoubleTap(previous, { x: 20, y: 30, time: 500 })).toBe(
      false,
    );
  });

  it('formats like counts compactly and clamps negative values', () => {
    expect(service.formatCount(1_200)).toBe(
      new Intl.NumberFormat(undefined, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(1_200),
    );
    expect(service.formatCount(-1)).toBe('0');
  });
});
