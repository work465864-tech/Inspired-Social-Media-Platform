import type { ChannelConnectionState } from '../types/connection';
import type { RealtimeChannelSetup } from '../types/subscription';
import { ConnectionManager } from './connectionManager';
import { ConnectionService } from './connectionService';
import { EventDispatcher } from './eventDispatcher';
import {
  RealtimeChannelFactory,
  type RealtimeChannel,
  type RealtimeChannelOptions,
  type RealtimeClient,
} from './realtimeChannelFactory';
import { SubscriptionRegistry } from './subscriptionRegistry';

type ManagedChannel = {
  key: string;
  topic: string;
  options?: RealtimeChannelOptions;
  setup: RealtimeChannelSetup;
  onStatus?: (status: ChannelConnectionState, error?: unknown) => void;
  channel: RealtimeChannel | null;
  active: boolean;
};

function mapChannelStatus(status: string): ChannelConnectionState {
  if (status === 'SUBSCRIBED') {
    return 'connected';
  }
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    return 'reconnecting';
  }
  if (status === 'CLOSED') {
    return 'disconnected';
  }
  return 'connecting';
}

export class RealtimeManager {
  private readonly channels = new Map<string, ManagedChannel>();

  constructor(
    private readonly client: RealtimeClient,
    private readonly channelFactory: RealtimeChannelFactory,
    private readonly registry: SubscriptionRegistry,
    private readonly connection: ConnectionService,
    private readonly connectionManager: ConnectionManager,
    private readonly events: EventDispatcher,
  ) {}

  subscribe(
    key: string,
    topic: string,
    setup: RealtimeChannelSetup,
    options?: RealtimeChannelOptions,
    onStatus?: ManagedChannel['onStatus'],
  ): () => void {
    const signature = `${topic.trim()}:${JSON.stringify(options ?? {})}`;
    try {
      return this.registry.acquire(key, signature, () => {
        const managed: ManagedChannel = {
          key,
          topic,
          options,
          setup,
          onStatus,
          channel: null,
          active: true,
        };
        this.channels.set(key, managed);
        try {
          this.activate(managed);
        } catch (error) {
          managed.active = false;
          this.channels.delete(key);
          this.connection.removeChannel(key);
          throw error;
        }

        return () => this.release(managed);
      });
    } catch (error) {
      this.connection.reportError(error, 'subscription');
      return () => undefined;
    }
  }

  retry(key: string): void {
    const managed = this.channels.get(key);
    if (managed) {
      this.connectionManager.retryNow(key, () => this.restart(managed));
    }
  }

  getChannelState(key: string): ChannelConnectionState | 'disconnected' {
    return this.connection.getSnapshot().channels[key] ?? 'disconnected';
  }

  dispose(): void {
    this.registry.dispose();
    this.channels.clear();
  }

  private activate(managed: ManagedChannel): void {
    if (!managed.active) {
      return;
    }
    const channel = this.channelFactory.create(managed.topic, managed.options);
    managed.channel = channel;
    this.connection.updateChannel(managed.key, 'connecting');
    managed.setup(channel, this.events);
    channel.subscribe((status, error) => {
      if (!managed.active || managed.channel !== channel) {
        return;
      }
      const channelStatus = mapChannelStatus(status);
      this.connection.updateChannel(managed.key, channelStatus, error);
      managed.onStatus?.(channelStatus, error);

      if (channelStatus === 'connected') {
        this.connectionManager.reset(managed.key);
      } else if (
        channelStatus === 'reconnecting' ||
        channelStatus === 'disconnected'
      ) {
        this.connectionManager.schedule(
          managed.key,
          () => this.restart(managed),
          () => {
            this.connection.updateChannel(
              managed.key,
              'error',
              error ??
                new Error('Realtime subscription retries were exhausted.'),
            );
          },
        );
      }
    });
  }

  private async restart(managed: ManagedChannel): Promise<void> {
    if (!managed.active || !this.connection.getSnapshot().isOnline) {
      return;
    }
    const previousChannel = managed.channel;
    managed.channel = null;
    if (previousChannel) {
      const result = await this.client.removeChannel(previousChannel);
      if (result !== 'ok') {
        throw new Error(
          `The failed realtime channel could not be removed (${result}).`,
        );
      }
    }
    if (managed.active) {
      this.activate(managed);
    }
  }

  private release(managed: ManagedChannel): void {
    if (!managed.active) {
      return;
    }
    managed.active = false;
    this.channels.delete(managed.key);
    this.connectionManager.cancel(managed.key);
    this.connection.removeChannel(managed.key);
    const channel = managed.channel;
    managed.channel = null;
    if (channel) {
      void this.client
        .removeChannel(channel)
        .then((result) => {
          if (result !== 'ok') {
            this.connection.reportError(
              new Error(`Realtime channel cleanup returned "${result}".`),
              'subscription',
            );
          }
        })
        .catch((error: unknown) =>
          this.connection.reportError(error, 'subscription'),
        );
    }
  }
}
