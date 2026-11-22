type PointerPoint = {
  x: number;
  y: number;
  time: number;
};

export class LikeAnimationService {
  readonly heartDurationMs = 850;

  formatCount(count: number): string {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.max(0, count));
  }

  isDoubleTap(
    previous: PointerPoint | null,
    current: PointerPoint,
    intervalMs = 320,
    distancePx = 48,
  ): boolean {
    if (!previous) {
      return false;
    }

    const elapsed = current.time - previous.time;
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    return elapsed >= 0 && elapsed <= intervalMs && distance <= distancePx;
  }
}

export const likeAnimationService = new LikeAnimationService();
