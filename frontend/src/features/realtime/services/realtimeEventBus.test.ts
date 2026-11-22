import { describe, expect, it, vi } from 'vitest';
import { ConnectionService } from './connectionService';
import { EventDispatcher } from './eventDispatcher';
import { RealtimeEventBus } from './realtimeEventBus';

describe('RealtimeEventBus', () => {
  it('dispatches typed events and releases listeners', () => {
    const connection = new ConnectionService();
    const eventBus = new RealtimeEventBus(connection);
    const dispatcher = new EventDispatcher(eventBus, vi.fn());
    const handler = vi.fn();
    const unsubscribe = eventBus.subscribe('LIKE_CREATED', handler);

    dispatcher.dispatch('LIKE_CREATED', {
      userId: 'user-1',
      videoId: 'video-1',
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LIKE_CREATED',
        payload: { userId: 'user-1', videoId: 'video-1' },
      }),
    );

    unsubscribe();
    dispatcher.dispatch('LIKE_CREATED', {
      userId: 'user-1',
      videoId: 'video-1',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports handler failures without blocking other listeners', () => {
    const connection = new ConnectionService();
    const eventBus = new RealtimeEventBus(connection);
    const dispatcher = new EventDispatcher(eventBus, vi.fn());
    const nextHandler = vi.fn();
    eventBus.subscribe('VIDEO_DELETED', () => {
      throw new Error('listener failure');
    });
    eventBus.subscribe('VIDEO_DELETED', nextHandler);

    dispatcher.dispatch('VIDEO_DELETED', { videoId: 'video-1' });

    expect(nextHandler).toHaveBeenCalledTimes(1);
    expect(connection.getSnapshot().lastError?.message).toBe(
      'listener failure',
    );
  });
});
