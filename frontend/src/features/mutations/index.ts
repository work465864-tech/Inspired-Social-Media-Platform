export { useCacheUpdate } from './hooks/useCacheUpdate';
export { useMutationQueue } from './hooks/useMutationQueue';
export {
  useOptimisticMutation,
  type OptimisticMutationOptions,
} from './hooks/useOptimisticMutation';
export { useOptimisticState } from './hooks/useOptimisticState';
export { useRollback } from './hooks/useRollback';
export { CacheManager } from './services/cacheManager';
export { CacheService } from './services/cacheService';
export { ConflictResolver } from './services/conflictResolver';
export { MutationManager } from './services/mutationManager';
export { MutationQueue } from './services/mutationQueue';
export { MutationService } from './services/mutationService';
export { OptimisticUpdateManager } from './services/optimisticUpdateManager';
export { RetryService } from './services/retryService';
export { RollbackManager } from './services/rollbackManager';
export { RollbackService } from './services/rollbackService';
export type { OptimisticTransaction } from './services/rollbackService';
export type {
  CacheInvalidation,
  MutationFailureKind,
  MutationQueueSnapshot,
} from './types';
