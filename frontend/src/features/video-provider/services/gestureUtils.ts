export type FeedDirection = 'next' | 'previous';

export function getSwipeDirection(
  startY: number,
  endY: number,
  threshold = 48,
): FeedDirection | null {
  const deltaY = startY - endY;
  if (Math.abs(deltaY) < threshold) {
    return null;
  }
  return deltaY > 0 ? 'next' : 'previous';
}

export function getWheelDirection(
  deltaY: number,
  deltaX: number,
  threshold = 40,
): FeedDirection | null {
  if (Math.abs(deltaY) < threshold || Math.abs(deltaY) < Math.abs(deltaX)) {
    return null;
  }
  return deltaY > 0 ? 'next' : 'previous';
}
