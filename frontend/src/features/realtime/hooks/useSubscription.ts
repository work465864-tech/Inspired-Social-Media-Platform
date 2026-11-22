'use client';

import { useEffect, useRef } from 'react';
import { useRealtimeContext } from '../../../providers/RealtimeProvider';
import type { RealtimeConnectionSnapshot } from '../types/connection';
import type { RealtimeChannelSetup } from '../types/subscription';
import type { RealtimeChannelOptions } from '../services/realtimeChannelFactory';

export function useSubscription(
  key: string,
  topic: string,
  setup: RealtimeChannelSetup,
  enabled = true,
  options?: RealtimeChannelOptions,
): RealtimeConnectionSnapshot['channels'][string] | 'disconnected' {
  const { service, connection } = useRealtimeContext();
  const setupRef = useRef(setup);
  const optionsRef = useRef(options);
  const optionsSignature = JSON.stringify(options ?? {});
  setupRef.current = setup;
  optionsRef.current = options;

  useEffect(() => {
    if (!service || !enabled) {
      return;
    }
    return service.subscribe(
      key,
      topic,
      (channel, events) => {
        setupRef.current(channel, events);
      },
      optionsRef.current,
    );
  }, [enabled, key, optionsSignature, service, topic]);

  return connection.channels[key] ?? 'disconnected';
}
