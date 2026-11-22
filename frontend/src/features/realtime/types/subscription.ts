import type { RealtimeChannel } from '../services/realtimeChannelFactory';
import type { EventDispatcher } from '../services/eventDispatcher';

export type RealtimeChannelSetup = (
  channel: RealtimeChannel,
  events: EventDispatcher,
) => void;
