import type { RealtimeChannelSetup } from '../types/subscription';
import { RealtimeManager } from './realtimeManager';
import type { RealtimeChannelOptions } from './realtimeChannelFactory';

export class SubscriptionService {
  constructor(private readonly manager: RealtimeManager) {}

  subscribe(
    key: string,
    topic: string,
    setup: RealtimeChannelSetup,
    options?: RealtimeChannelOptions,
  ): () => void {
    return this.manager.subscribe(key, topic, setup, options);
  }

  retry(key: string): void {
    this.manager.retry(key);
  }

  getState(key: string) {
    return this.manager.getChannelState(key);
  }
}
