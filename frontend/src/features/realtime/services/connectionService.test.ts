import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionManager } from './connectionManager';
import { ConnectionService } from './connectionService';

function installNetwork(initiallyOnline: boolean) {
  const handlers = new Map<string, Array<() => void>>();
  const network = { onLine: initiallyOnline };
  vi.stubGlobal('navigator', network);
  vi.stubGlobal('window', {
    addEventListener: (event: string, handler: () => void) => {
      const eventHandlers = handlers.get(event) ?? [];
      eventHandlers.push(handler);
      handlers.set(event, eventHandlers);
    },
    removeEventListener: (event: string, handler: () => void) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter(
          (registeredHandler) => registeredHandler !== handler,
        ),
      );
    },
    setTimeout,
    clearTimeout,
  });

  return {
    setOnline(isOnline: boolean) {
      network.onLine = isOnline;
      for (const handler of handlers.get(isOnline ? 'online' : 'offline') ??
        []) {
        handler();
      }
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ConnectionService', () => {
  it('announces online and offline transitions', () => {
    const network = installNetwork(true);
    const connection = new ConnectionService();
    connection.start();
    const statuses: string[] = [];
    const unsubscribe = connection.subscribe((snapshot) =>
      statuses.push(snapshot.status),
    );

    network.setOnline(false);
    network.setOnline(true);

    expect(statuses).toContain('offline');
    expect(statuses.at(-1)).toBe('disconnected');
    unsubscribe();
    connection.dispose();
  });

  it('retries with exponential backoff and resumes after offline recovery', async () => {
    vi.useFakeTimers();
    const network = installNetwork(false);
    const connection = new ConnectionService();
    connection.start();
    const manager = new ConnectionManager(connection, 3, 100, 400);
    const retry = vi.fn(async () => undefined);
    const exhausted = vi.fn();

    manager.schedule('messages', retry, exhausted);
    expect(retry).not.toHaveBeenCalled();

    network.setOnline(true);
    await vi.waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
    manager.schedule('messages', retry, exhausted);
    await vi.advanceTimersByTimeAsync(199);
    expect(retry).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(retry).toHaveBeenCalledTimes(2);
    expect(exhausted).not.toHaveBeenCalled();

    manager.dispose();
    connection.dispose();
  });
});
