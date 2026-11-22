'use client';

import { useEffect, useRef, useState } from 'react';
import { useRealtimeContext } from '../../../providers/RealtimeProvider';
import type { PresenceSnapshot } from '../services/presenceService';

export function usePresence<T extends Record<string, unknown>>(
  topic: string,
  key: string,
  payload: T,
  enabled = true,
) {
  const { service, connection } = useRealtimeContext();
  const [state, setState] = useState<PresenceSnapshot<T>>({});
  const [synced, setSynced] = useState(false);
  const stateListenerRef = useRef(setState);
  const payloadRef = useRef(payload);
  const payloadSignature = JSON.stringify(payload);
  stateListenerRef.current = setState;
  payloadRef.current = payload;

  useEffect(() => {
    if (!service || !enabled) {
      setSynced(false);
      return;
    }
    setSynced(false);
    return service.presence.join(
      topic,
      key,
      payloadRef.current,
      (nextState) => {
        stateListenerRef.current(nextState);
        setSynced(true);
      },
    );
  }, [enabled, key, payloadSignature, service, topic]);

  const status =
    connection.channels[`presence:${topic}:${key}`] ?? 'disconnected';
  useEffect(() => {
    if (status !== 'connected') {
      setSynced(false);
    }
  }, [status]);

  return {
    state: service && enabled ? state : {},
    status,
    synced,
  };
}
