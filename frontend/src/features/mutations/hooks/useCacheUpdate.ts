'use client';

import { useMutationLayer } from '../../../providers/MutationProvider';

export function useCacheUpdate() {
  const { service } = useMutationLayer();
  return service.cache;
}
