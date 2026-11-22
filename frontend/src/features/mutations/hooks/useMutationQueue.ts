'use client';

import { useSyncExternalStore } from 'react';
import { useMutationLayer } from '../../../providers/MutationProvider';

export function useMutationQueue() {
  const { service } = useMutationLayer();
  return useSyncExternalStore(
    service.queue.subscribe,
    service.queue.getSnapshot,
    service.queue.getSnapshot,
  );
}
