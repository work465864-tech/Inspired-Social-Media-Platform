import { recommendationCacheTtlMs, scoreCacheTtlMs } from '../constants';
import type { InterestProfile, RecommendationItem } from '../types';

type CacheEntry<Value> = {
  value: Value;
  expiresAt: number;
};

const maxSessionEntries = 24;
const maxScoreEntries = 1_000;
const maxProfileEntries = 100;

export class RecommendationCache {
  private readonly sessions = new Map<
    string,
    CacheEntry<RecommendationItem[]>
  >();
  private readonly scores = new Map<string, CacheEntry<number>>();
  private readonly profiles = new Map<string, CacheEntry<InterestProfile>>();

  createSession(
    userId: string,
    items: RecommendationItem[],
    now = Date.now(),
  ): string {
    const sessionId = globalThis.crypto?.randomUUID?.();
    if (!sessionId) {
      throw new Error('Secure session IDs are unavailable in this runtime.');
    }

    this.write(
      this.sessions,
      `${userId}:${sessionId}`,
      items,
      now + recommendationCacheTtlMs,
      maxSessionEntries,
    );
    for (const item of items) {
      this.setScore(userId, item.video.id, item.score, now);
    }
    return sessionId;
  }

  getSession(
    userId: string,
    sessionId: string,
    now = Date.now(),
  ): RecommendationItem[] | null {
    return this.read(this.sessions, `${userId}:${sessionId}`, now);
  }

  getScore(userId: string, videoId: string, now = Date.now()): number | null {
    return this.read(this.scores, `${userId}:${videoId}`, now);
  }

  setScore(
    userId: string,
    videoId: string,
    score: number,
    now = Date.now(),
  ): void {
    this.write(
      this.scores,
      `${userId}:${videoId}`,
      score,
      now + scoreCacheTtlMs,
      maxScoreEntries,
    );
  }

  getInterestProfile(userId: string, now = Date.now()): InterestProfile | null {
    return this.read(this.profiles, userId, now);
  }

  setInterestProfile(profile: InterestProfile, now = Date.now()): void {
    this.write(
      this.profiles,
      profile.userId,
      profile,
      now + recommendationCacheTtlMs,
      maxProfileEntries,
    );
  }

  invalidateUser(userId: string): void {
    const prefix = `${userId}:`;
    for (const key of this.sessions.keys()) {
      if (key.startsWith(prefix)) {
        this.sessions.delete(key);
      }
    }
    for (const key of this.scores.keys()) {
      if (key.startsWith(prefix)) {
        this.scores.delete(key);
      }
    }
    this.profiles.delete(userId);
  }

  clear(): void {
    this.sessions.clear();
    this.scores.clear();
    this.profiles.clear();
  }

  private read<Value>(
    entries: Map<string, CacheEntry<Value>>,
    key: string,
    now: number,
  ): Value | null {
    const entry = entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      entries.delete(key);
      return null;
    }

    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  }

  private write<Value>(
    entries: Map<string, CacheEntry<Value>>,
    key: string,
    value: Value,
    expiresAt: number,
    maxEntries: number,
  ): void {
    entries.delete(key);
    entries.set(key, { value, expiresAt });
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      entries.delete(oldestKey);
    }
  }
}

export const recommendationCache = new RecommendationCache();
