import type { QueryClient } from '@tanstack/react-query';
import { ConflictResolver } from './conflictResolver';
import { RollbackService, type OptimisticTransaction } from './rollbackService';

export class RollbackManager {
  private readonly rollbackService: RollbackService;

  constructor(queryClient: QueryClient, conflictResolver: ConflictResolver) {
    this.rollbackService = new RollbackService(queryClient, conflictResolver);
  }

  begin(): OptimisticTransaction {
    return this.rollbackService.createTransaction();
  }
}
