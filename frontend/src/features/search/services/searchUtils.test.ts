import { describe, expect, it } from 'vitest';
import type { SearchPageCursor } from '../types';
import {
  isValidSearchCursor,
  normalizeSearchQuery,
  SearchError,
  shouldRetrySearch,
} from './searchUtils';

describe('search utilities', () => {
  it('normalizes Unicode, removes controls and reserved punctuation, and bounds input', () => {
    expect(normalizeSearchQuery('  #Café\u0000  videos!  ')).toBe(
      'Café videos',
    );
    expect(normalizeSearchQuery('x'.repeat(140))).toHaveLength(120);
  });

  it('validates target-specific pagination cursors', () => {
    const userCursor: SearchPageCursor = {
      target: 'people',
      username: 'creator.name',
    };
    const videoCursor: SearchPageCursor = {
      target: 'videos',
      sort: 'popular',
      viewsCount: 12,
      createdAt: '2026-01-01T00:00:00.000Z',
      id: '3d6046ad-4b13-44c3-8db0-4b63815009a8',
    };

    expect(isValidSearchCursor('people', userCursor, 'recent')).toBe(true);
    expect(isValidSearchCursor('videos', videoCursor, 'popular')).toBe(true);
    expect(isValidSearchCursor('videos', videoCursor, 'recent')).toBe(false);
    expect(
      isValidSearchCursor(
        'hashtags',
        { target: 'hashtags', slug: 'bad/slug' },
        'recent',
      ),
    ).toBe(false);
  });

  it('retries only transient search errors', () => {
    expect(shouldRetrySearch(0, new SearchError('timeout', 'Timed out'))).toBe(
      true,
    );
    expect(
      shouldRetrySearch(0, new SearchError('validation', 'Invalid query')),
    ).toBe(false);
    expect(shouldRetrySearch(2, new SearchError('server', 'Unavailable'))).toBe(
      false,
    );
  });
});
