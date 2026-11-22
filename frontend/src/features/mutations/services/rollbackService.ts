import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { ConflictResolver } from './conflictResolver';

type Snapshot = {
  queryKey: QueryKey;
  previousValue: unknown;
  optimisticValue: unknown;
};

export type OptimisticTransaction = {
  update<T>(queryKey: QueryKey, updater: (current: T | undefined) => T): void;
  rollback(): void;
  commit(): void;
};

class QueryOptimisticTransaction implements OptimisticTransaction {
  private readonly snapshots: Snapshot[] = [];
  private closed = false;

  constructor(
    private readonly queryClient: QueryClient,
    private readonly conflictResolver: ConflictResolver,
  ) {}

  update<T>(queryKey: QueryKey, updater: (current: T | undefined) => T): void {
    if (this.closed) {
      throw new Error('Cannot update a completed optimistic transaction.');
    }

    const previousValue = this.queryClient.getQueryData<T>(queryKey);
    this.queryClient.setQueryData<T>(queryKey, updater(previousValue));
    this.snapshots.push({
      queryKey,
      previousValue,
      optimisticValue: this.queryClient.getQueryData<T>(queryKey),
    });
  }

  rollback(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;

    for (const snapshot of this.snapshots.reverse()) {
      const currentValue = this.queryClient.getQueryData(snapshot.queryKey);
      if (
        !this.conflictResolver.shouldRollback(
          currentValue,
          snapshot.optimisticValue,
        )
      ) {
        continue;
      }

      if (snapshot.previousValue === undefined) {
        this.queryClient.removeQueries({
          queryKey: snapshot.queryKey,
          exact: true,
        });
      } else {
        this.queryClient.setQueryData(
          snapshot.queryKey,
          snapshot.previousValue,
        );
      }
    }
  }

  commit(): void {
    this.closed = true;
    this.snapshots.length = 0;
  }
}

export class RollbackService {
  constructor(
    private readonly queryClient: QueryClient,
    private readonly conflictResolver: ConflictResolver,
  ) {}

  createTransaction(): OptimisticTransaction {
    return new QueryOptimisticTransaction(
      this.queryClient,
      this.conflictResolver,
    );
  }
}
