import type { FeedScrollPosition } from '../types/feed';

const scrollStoragePrefix = 'connectly:feed-scroll:';

function getStorageKey(feedKey: string): string {
  return `${scrollStoragePrefix}${feedKey}`;
}

export const feedScrollManager = {
  read(feedKey: string): FeedScrollPosition | null {
    try {
      const value = window.sessionStorage.getItem(getStorageKey(feedKey));
      if (!value) {
        return null;
      }

      const position: unknown = JSON.parse(value);
      if (
        typeof position !== 'object' ||
        position === null ||
        !('scrollY' in position) ||
        typeof position.scrollY !== 'number' ||
        !Number.isFinite(position.scrollY) ||
        !('activeItemId' in position) ||
        (typeof position.activeItemId !== 'string' &&
          position.activeItemId !== null)
      ) {
        throw new TypeError('Saved feed scroll position has an invalid shape.');
      }

      return {
        scrollY: Math.max(0, position.scrollY),
        activeItemId: position.activeItemId,
      };
    } catch (error) {
      console.warn('Unable to restore the saved feed position.', error);
      return null;
    }
  },

  save(feedKey: string, position: FeedScrollPosition): void {
    try {
      window.sessionStorage.setItem(
        getStorageKey(feedKey),
        JSON.stringify(position),
      );
    } catch (error) {
      console.warn('Unable to save the feed position.', error);
    }
  },
};
