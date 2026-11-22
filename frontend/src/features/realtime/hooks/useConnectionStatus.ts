'use client';

import { useRealtimeContext } from '../../../providers/RealtimeProvider';

export function useConnectionStatus() {
  return useRealtimeContext().connection;
}
