'use client';

import type { RealtimeChannelSetup } from '../types/subscription';
import type { RealtimeChannelOptions } from '../services/realtimeChannelFactory';
import { useSubscription } from './useSubscription';

export function useChannel(
  topic: string,
  setup: RealtimeChannelSetup,
  enabled = true,
  options?: RealtimeChannelOptions,
) {
  return useSubscription(topic, topic, setup, enabled, options);
}
