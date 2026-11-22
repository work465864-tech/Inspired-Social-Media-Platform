import type { FeedVisibilityUpdate } from '../types/feed';

export function selectActiveFeedItem(
  visibility: Map<string, number>,
  threshold: number,
): string | null {
  let activeId: string | null = null;
  let highestRatio = threshold;

  for (const [id, ratio] of visibility) {
    if (ratio >= threshold && (activeId === null || ratio > highestRatio)) {
      activeId = id;
      highestRatio = ratio;
    }
  }

  return activeId;
}

export function updateFeedVisibility(
  visibility: Map<string, number>,
  update: FeedVisibilityUpdate,
): void {
  if (update.ratio <= 0) {
    visibility.delete(update.id);
    return;
  }

  visibility.set(update.id, update.ratio);
}
