import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchTopMock } = vi.hoisted(() => ({
  searchTopMock: vi.fn(),
}));

vi.mock('./searchService', () => ({
  searchService: { searchTop: searchTopMock },
}));

import type { SearchResult } from '../types';
import { SuggestionService } from './suggestionService';

describe('SuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps people and hashtags into selectable search suggestions', async () => {
    const results: SearchResult[] = [
      {
        kind: 'user',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          username: 'creator',
          displayName: 'Creator One',
          avatarUrl: null,
          isVerified: true,
          isPrivate: false,
          bio: '',
        },
      },
      {
        kind: 'hashtag',
        hashtag: { id: 8, slug: 'dance' },
      },
    ];
    searchTopMock.mockResolvedValue(results);

    await expect(
      new SuggestionService().getSuggestions(
        'cre',
        new AbortController().signal,
      ),
    ).resolves.toEqual([
      {
        id: 'user:00000000-0000-4000-8000-000000000001',
        label: '@creator',
        description: 'Creator One',
        query: 'creator',
        tab: 'people',
      },
      {
        id: 'hashtag:8',
        label: '#dance',
        description: 'Hashtag',
        query: 'dance',
        tab: 'hashtags',
      },
    ]);
    expect(searchTopMock).toHaveBeenCalledWith('cre', expect.any(AbortSignal));
  });
});
