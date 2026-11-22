import type { UseQueryOptions } from '@tanstack/react-query';
import type { CacheInvalidation } from '../types';
import { CacheService } from './cacheService';

export class CacheManager {
  constructor(private readonly cacheService: CacheService) {}

  async invalidateMany(invalidations: CacheInvalidation[]): Promise<void> {
    await Promise.all(
      invalidations.map(({ queryKey, refetchType }) =>
        this.cacheService.invalidate(queryKey, refetchType),
      ),
    );
  }

  prefetch<TQueryFnData>(
    options: Pick<
      UseQueryOptions<TQueryFnData>,
      'queryKey' | 'queryFn' | 'staleTime'
    >,
  ): Promise<void> {
    return this.cacheService.prefetch(options);
  }
}
