import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ConflictResolver } from './conflictResolver';
import { RollbackService } from './rollbackService';

describe('RollbackService', () => {
  it('restores optimistic values but preserves cache changes made afterward', () => {
    const queryClient = new QueryClient();
    const rollbackService = new RollbackService(
      queryClient,
      new ConflictResolver(),
    );
    const queryKey = ['feed', 'videos'];
    queryClient.setQueryData(queryKey, [{ id: 'video-1', liked: false }]);

    const transaction = rollbackService.createTransaction();
    transaction.update<Array<{ id: string; liked: boolean }>>(
      queryKey,
      (videos) => videos?.map((video) => ({ ...video, liked: true })) ?? [],
    );
    transaction.rollback();
    expect(queryClient.getQueryData(queryKey)).toEqual([
      { id: 'video-1', liked: false },
    ]);

    const secondTransaction = rollbackService.createTransaction();
    secondTransaction.update<Array<{ id: string; liked: boolean }>>(
      queryKey,
      (videos) => videos?.map((video) => ({ ...video, liked: true })) ?? [],
    );
    queryClient.setQueryData(queryKey, [{ id: 'video-1', liked: false }]);
    secondTransaction.rollback();
    expect(queryClient.getQueryData(queryKey)).toEqual([
      { id: 'video-1', liked: false },
    ]);

    queryClient.clear();
  });
});
