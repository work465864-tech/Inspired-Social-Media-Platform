import type {
  RealtimeEvent,
  RealtimeEventHandler,
  RealtimeEventName,
} from '../types/events';
import type { ConnectionService } from './connectionService';

type EventListener = (event: RealtimeEvent) => void;

export class RealtimeEventBus {
  private readonly listeners = new Map<RealtimeEventName, Set<EventListener>>();

  constructor(private readonly connection: ConnectionService) {}

  subscribe<T extends RealtimeEventName>(
    type: T,
    handler: RealtimeEventHandler<T>,
  ): () => void {
    let listeners = this.listeners.get(type);
    if (!listeners) {
      listeners = new Set<EventListener>();
      this.listeners.set(type, listeners);
    }

    const listener: EventListener = (event) => {
      handler(event as RealtimeEvent<T>);
    };
    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  dispatch(event: RealtimeEvent): void {
    for (const listener of this.listeners.get(event.type) ?? []) {
      try {
        listener(event);
      } catch (error) {
        this.connection.reportError(error, 'unexpected');
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
