import type { QueryKey } from '@tanstack/react-query';

export type MutationFailureKind =
  'network' | 'conflict' | 'permission' | 'timeout' | 'unexpected';

export type MutationQueueSnapshot = {
  pendingCount: number;
  isOnline: boolean;
  isProcessing: boolean;
};

export type CacheInvalidation = {
  queryKey: QueryKey;
  refetchType?: 'active' | 'inactive' | 'all' | 'none';
};
