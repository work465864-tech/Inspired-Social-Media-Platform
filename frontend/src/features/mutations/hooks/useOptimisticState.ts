'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutationLayer } from '../../../providers/MutationProvider';

export function useOptimisticState<T>(initialState: T) {
  useMutationLayer();
  const [state, setState] = useState(initialState);
  const previousState = useRef<T>(initialState);
  const hasPendingUpdate = useRef(false);

  const setOptimistic = useCallback((next: T | ((current: T) => T)) => {
    setState((current) => {
      if (!hasPendingUpdate.current) {
        previousState.current = current;
        hasPendingUpdate.current = true;
      }
      return typeof next === 'function'
        ? (next as (current: T) => T)(current)
        : next;
    });
  }, []);

  const rollback = useCallback(() => {
    if (!hasPendingUpdate.current) {
      return;
    }
    hasPendingUpdate.current = false;
    setState(previousState.current);
  }, []);

  const commit = useCallback(() => {
    hasPendingUpdate.current = false;
  }, []);

  return { state, setOptimistic, rollback, commit };
}
