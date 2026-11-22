import type {
  RealtimeEvent,
  RealtimeEventHandler,
  RealtimeEventName,
  RealtimeEventPayloads,
} from '../types/events';
import { RealtimeEventBus } from './realtimeEventBus';

export class EventDispatcher {
  constructor(
    private readonly eventBus: RealtimeEventBus,
    private readonly onDispatch: (event: RealtimeEvent) => void,
  ) {}

  dispatch<T extends RealtimeEventName>(
    type: T,
    payload: RealtimeEventPayloads[T],
  ): void {
    const event = {
      type,
      payload,
      receivedAt: Date.now(),
    } as RealtimeEvent<T>;
    this.onDispatch(event as RealtimeEvent);
    this.eventBus.dispatch(event as RealtimeEvent);
  }

  subscribe<T extends RealtimeEventName>(
    type: T,
    handler: RealtimeEventHandler<T>,
  ): () => void {
    return this.eventBus.subscribe(type, handler);
  }
}
