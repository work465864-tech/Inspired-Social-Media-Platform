import type {
  QueryClient,
  QueryKey,
  UseQueryOptions,
} from '@tanstack/react-query';

export class CacheService {
  constructor(private readonly queryClient: QueryClient) {}

  get<T>(queryKey: QueryKey): T | undefined {
    return this.queryClient.getQueryData<T>(queryKey);
  }

  set<T>(
    queryKey: QueryKey,
    updater: T | ((current: T | undefined) => T | undefined),
  ): T | undefined {
    return this.queryClient.setQueryData<T>(queryKey, updater);
  }

  async invalidate(
    queryKey: QueryKey,
    refetchType: 'active' | 'inactive' | 'all' | 'none' = 'active',
  ): Promise<void> {
    await this.queryClient.invalidateQueries({ queryKey, refetchType });
  }

  async prefetch<TQueryFnData>(
    options: Pick<
      UseQueryOptions<TQueryFnData>,
      'queryKey' | 'queryFn' | 'staleTime'
    >,
  ): Promise<void> {
    await this.queryClient.prefetchQuery(options);
  }
}
