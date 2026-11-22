import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { CacheService } from './cacheService';

describe('CacheService', () => {
  it('updates, selectively invalidates, and prefetches cache entries', async () => {
    const queryClient = new QueryClient();
    const cache = new CacheService(queryClient);
    const queryKey = ['profile', 'user-1'];
    const prefetchKey = ['profile', 'prefetch'];
    const queryFn = vi.fn(async () => ({ name: 'Connectly' }));

    cache.set(queryKey, { name: 'Optimistic' });
    expect(cache.get(queryKey)).toEqual({ name: 'Optimistic' });

    await cache.prefetch({
      queryKey: prefetchKey,
      queryFn,
      staleTime: 60_000,
    });
    expect(cache.get(prefetchKey)).toEqual({ name: 'Connectly' });
    await cache.invalidate(queryKey, 'none');
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);

    queryClient.clear();
  });
});
