'use client';

import { useEffect, useRef } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import type { RealtimeEventHandler, RealtimeEventName } from '../types/events';
import { useRealtimeContext } from '../../../providers/RealtimeProvider';

export function useRealtimeEvent<T extends RealtimeEventName>(
  type: T,
  handler: RealtimeEventHandler<T>,
  queryKey?: QueryKey,
): void {
  const { service } = useRealtimeContext();
  const handlerRef = useRef(handler);
  const queryKeyRef = useRef(queryKey);
  handlerRef.current = handler;
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (!service) {
      return;
    }
    return service.subscribeEvent(type, (event) => {
      const currentQueryKey = queryKeyRef.current;
      if (currentQueryKey) {
        void service.invalidateQuery(currentQueryKey);
      }
      handlerRef.current(event);
    });
  }, [service, type]);
}
