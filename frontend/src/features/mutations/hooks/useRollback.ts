'use client';

import { useCallback } from 'react';
import { useMutationLayer } from '../../../providers/MutationProvider';

export function useRollback() {
  const { service } = useMutationLayer();
  const createTransaction = useCallback(
    () => service.optimistic.begin(),
    [service],
  );
  return { createTransaction };
}
