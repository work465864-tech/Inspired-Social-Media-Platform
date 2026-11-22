import type { QueryClient } from '@tanstack/react-query';
import { ConflictResolver } from './conflictResolver';
import { RollbackManager } from './rollbackManager';
import type { OptimisticTransaction } from './rollbackService';

export class OptimisticUpdateManager {
  private readonly rollbackManager: RollbackManager;

  constructor(queryClient: QueryClient, conflictResolver: ConflictResolver) {
    this.rollbackManager = new RollbackManager(queryClient, conflictResolver);
  }

  begin(): OptimisticTransaction {
    return this.rollbackManager.begin();
  }
}
