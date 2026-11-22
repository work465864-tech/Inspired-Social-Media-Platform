import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type {
  RealtimeEventHandler,
  RealtimeEventName,
  RealtimeEventPayloads,
} from '../types/events';
import { ConnectionManager } from './connectionManager';
import { ConnectionService } from './connectionService';
import { EventDispatcher } from './eventDispatcher';
import { PresenceManager } from './presenceManager';
import { PresenceService } from './presenceService';
import { QuerySyncService } from './querySyncService';
import {
  RealtimeChannelFactory,
  type RealtimeChannelOptions,
  type RealtimeClient,
} from './realtimeChannelFactory';
import { RealtimeEventBus } from './realtimeEventBus';
import { RealtimeManager } from './realtimeManager';
import { SubscriptionRegistry } from './subscriptionRegistry';
import { SubscriptionService } from './subscriptionService';
import type { RealtimeChannelSetup } from '../types/subscription';

export class RealtimeService {
  readonly connection: ConnectionService;
  readonly events: RealtimeEventBus;
  readonly subscriptions: SubscriptionService;
  readonly presence: PresenceService;
  readonly presenceManager: PresenceManager;

  private readonly eventDispatcher: EventDispatcher;
  private readonly querySync: QuerySyncService;
  private readonly connectionManager: ConnectionManager;
  private readonly realtimeManager: RealtimeManager;

  constructor(client: RealtimeClient, queryClient: QueryClient) {
    this.connection = new ConnectionService();
    this.events = new RealtimeEventBus(this.connection);
    this.querySync = new QuerySyncService(queryClient, (error) =>
      this.connection.reportError(error),
    );
    this.eventDispatcher = new EventDispatcher(this.events, (event) =>
      this.querySync.syncForEvent(event),
    );
    this.connectionManager = new ConnectionManager(this.connection);
    const registry = new SubscriptionRegistry((error) =>
      this.connection.reportError(error, 'subscription'),
    );
    const channelFactory = new RealtimeChannelFactory(client);
    this.realtimeManager = new RealtimeManager(
      client,
      channelFactory,
      registry,
      this.connection,
      this.connectionManager,
      this.eventDispatcher,
    );
    this.subscriptions = new SubscriptionService(this.realtimeManager);
    this.presenceManager = new PresenceManager(
      this.realtimeManager,
      this.connection,
    );
    this.presence = new PresenceService(this.presenceManager);
  }

  start(): void {
    this.connection.start();
  }

  subscribe(
    key: string,
    topic: string,
    setup: RealtimeChannelSetup,
    options?: RealtimeChannelOptions,
  ): () => void {
    return this.subscriptions.subscribe(key, topic, setup, options);
  }

  subscribeEvent<T extends RealtimeEventName>(
    type: T,
    handler: RealtimeEventHandler<T>,
  ): () => void {
    return this.events.subscribe(type, handler);
  }

  dispatch<T extends RealtimeEventName>(
    type: T,
    payload: RealtimeEventPayloads[T],
  ): void {
    this.eventDispatcher.dispatch(type, payload);
  }

  retrySubscription(key: string): void {
    this.subscriptions.retry(key);
  }

  invalidateQuery(queryKey: QueryKey): Promise<void> {
    return this.querySync.invalidate(queryKey);
  }

  applyOptimisticUpdate<T>(
    queryKey: QueryKey,
    updater: (current: T | undefined) => T,
  ): () => void {
    return this.querySync.applyOptimisticUpdate(queryKey, updater);
  }

  dispose(): void {
    this.realtimeManager.dispose();
    this.connectionManager.dispose();
    this.querySync.dispose();
    this.events.clear();
    this.connection.dispose();
  }
}
