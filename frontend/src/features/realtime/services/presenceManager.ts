import type { RealtimeChannelSetup } from '../types/subscription';
import { ConnectionService } from './connectionService';
import type { RealtimeChannel } from './realtimeChannelFactory';
import { RealtimeManager } from './realtimeManager';
import type { PresenceSnapshot } from './presenceService';

export class PresenceManager {
  constructor(
    private readonly realtimeManager: RealtimeManager,
    private readonly connection: ConnectionService,
  ) {}

  join<T extends Record<string, unknown>>(
    topic: string,
    key: string,
    payload: T,
    onSync: (state: PresenceSnapshot<T>) => void,
  ): () => void {
    let activeChannel: RealtimeChannel | null = null;
    const setup: RealtimeChannelSetup = (channel) => {
      activeChannel = channel;
      channel.on('presence', { event: 'sync' }, () => {
        onSync(channel.presenceState<T>());
      });
    };

    return this.realtimeManager.subscribe(
      `presence:${topic}:${key}`,
      topic,
      setup,
      { config: { presence: { key, enabled: true } } },
      (status) => {
        const channel = activeChannel;
        if (status !== 'connected' || !channel) {
          return;
        }
        void channel
          .track(payload)
          .then((response) => {
            if (response !== 'ok') {
              this.connection.reportError(
                new Error(`Presence tracking returned "${response}".`),
                'subscription',
              );
            }
          })
          .catch((error: unknown) =>
            this.connection.reportError(error, 'subscription'),
          );
      },
    );
  }
}
