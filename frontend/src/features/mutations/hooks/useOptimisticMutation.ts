'use client';

import {
  useMutation,
  type MutationKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { CacheInvalidation } from '../types';
import type { CacheService } from '../services/cacheService';
import type { OptimisticTransaction } from '../services/rollbackService';
import { useMutationLayer } from '../../../providers/MutationProvider';

type MutationLifecycleContext<TContext> = {
  transaction: OptimisticTransaction;
  userContext: TContext | undefined;
};

export type OptimisticMutationOptions<
  TData,
  TError,
  TVariables,
  TContext = void,
> = {
  mutationKey?: MutationKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  dedupeKey?: (variables: TVariables) => string | undefined;
  optimisticUpdate?: (
    variables: TVariables,
    transaction: OptimisticTransaction,
    cache: CacheService,
  ) => void | Promise<void>;
  invalidate?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
  ) => CacheInvalidation[];
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: MutationLifecycleContext<TContext> | undefined,
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    variables: TVariables,
    context: MutationLifecycleContext<TContext> | undefined,
  ) => void | Promise<void>;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: MutationLifecycleContext<TContext> | undefined,
  ) => void | Promise<void>;
  retry?: boolean | ((failureCount: number, error: TError) => boolean);
};

export function useOptimisticMutation<
  TData,
  TError = Error,
  TVariables = void,
  TContext = void,
>(
  options: OptimisticMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<
  TData,
  TError,
  TVariables,
  MutationLifecycleContext<TContext>
> {
  const { service } = useMutationLayer();

  return useMutation<
    TData,
    TError,
    TVariables,
    MutationLifecycleContext<TContext>
  >({
    mutationKey: options.mutationKey,
    mutationFn: (variables) =>
      service.manager.execute(options.dedupeKey?.(variables), () =>
        service.queue.enqueue(() => options.mutationFn(variables)),
      ),
    onMutate: async (variables) => {
      const transaction = service.optimistic.begin();
      try {
        await options.optimisticUpdate?.(variables, transaction, service.cache);
        const userContext = await options.onMutate?.(variables);
        return { transaction, userContext };
      } catch (error) {
        transaction.rollback();
        throw error;
      }
    },
    onSuccess: async (data, variables, context) => {
      context?.transaction.commit();
      await options.onSuccess?.(data, variables, context);
    },
    onError: async (error, variables, context) => {
      context?.transaction.rollback();
      await options.onError?.(error, variables, context);
    },
    onSettled: async (data, error, variables, context) => {
      const invalidations = options.invalidate?.(data, error, variables) ?? [];
      await service.cacheManager.invalidateMany(invalidations);
      await options.onSettled?.(data, error, variables, context);
    },
    retry:
      options.retry === undefined
        ? (failureCount, error) =>
            service.retry.shouldRetry(failureCount, error)
        : options.retry,
    retryDelay: (failureCount) => service.retry.delay(failureCount),
  });
}
