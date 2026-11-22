import type { Video } from '../types';

export type FeedCacheEntry = {
  databaseVideos: Video[];
  items: Video[];
  nextFallbackPage: number | null;
  fallbackExhausted: boolean;
  createdAt: number;
};

export class FeedCache {
  private readonly entries = new Map<string, FeedCacheEntry>();

  constructor(
    private readonly ttlMs = 10 * 60_000,
    private readonly maximumEntries = 50,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): FeedCacheEntry | null {
    const entry = this.entries.get(key);
    if (!entry || this.now() - entry.createdAt >= this.ttlMs) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, entry: FeedCacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maximumEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

export const feedCache = new FeedCache();
