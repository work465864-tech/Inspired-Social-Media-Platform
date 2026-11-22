import { describe, expect, it, vi } from 'vitest';
import { ProviderVideoRepository } from './videoRepository';
import type { VideoProvider } from '../providers/videoProvider';

describe('ProviderVideoRepository', () => {
  it('trims and forwards a validated search query', async () => {
    const getPage = vi.fn(async () => ({
      items: [],
      nextPage: null,
      totalHits: 0,
    }));
    const repository = new ProviderVideoRepository({
      id: 'pixabay',
      getPage,
    } satisfies VideoProvider);
    const signal = new AbortController().signal;

    await repository.getPage(
      { kind: 'search', query: '  ocean  ', page: 1, pageSize: 12 },
      signal,
    );

    expect(getPage).toHaveBeenCalledWith(
      { kind: 'search', query: 'ocean', page: 1, pageSize: 12 },
      signal,
    );
  });

  it('rejects invalid search terms before calling a provider', async () => {
    const getPage = vi.fn(async () => ({
      items: [],
      nextPage: null,
      totalHits: 0,
    }));
    const repository = new ProviderVideoRepository({
      id: 'pixabay',
      getPage,
    } satisfies VideoProvider);

    await expect(
      repository.getPage(
        { kind: 'search', query: 'a', page: 1, pageSize: 12 },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 400, code: 'validation' });
    expect(getPage).not.toHaveBeenCalled();
  });
});
