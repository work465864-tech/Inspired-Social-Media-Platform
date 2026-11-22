import type { QueryClient } from '@tanstack/react-query';
import { CacheManager } from './cacheManager';
import { CacheService } from './cacheService';
import { ConflictResolver } from './conflictResolver';
import { MutationManager } from './mutationManager';
import { MutationQueue } from './mutationQueue';
import { OptimisticUpdateManager } from './optimisticUpdateManager';
import { RetryService } from './retryService';

export class MutationService {
  readonly cache: CacheService;
  readonly cacheManager: CacheManager;
  readonly conflicts: ConflictResolver;
  readonly manager: MutationManager;
  readonly queue: MutationQueue;
  readonly optimistic: OptimisticUpdateManager;
  readonly retry: RetryService;

  constructor(queryClient: QueryClient) {
    this.cache = new CacheService(queryClient);
    this.cacheManager = new CacheManager(this.cache);
    this.conflicts = new ConflictResolver();
    this.manager = new MutationManager();
    this.queue = new MutationQueue();
    this.optimistic = new OptimisticUpdateManager(queryClient, this.conflicts);
    this.retry = new RetryService();
  }

  start(): void {
    this.queue.start();
  }

  dispose(): void {
    this.queue.dispose();
  }
}
