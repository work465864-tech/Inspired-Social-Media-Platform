'use client';

import { useRealtimeContext } from '../../../providers/RealtimeProvider';

export function useRealtime() {
  return useRealtimeContext();
}
