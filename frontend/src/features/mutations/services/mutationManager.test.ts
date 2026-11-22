import { describe, expect, it, vi } from 'vitest';
import { MutationManager } from './mutationManager';

describe('MutationManager', () => {
  it('deduplicates concurrent requests with the same key', async () => {
    const manager = new MutationManager();
    let resolveRequest: ((value: string) => void) | undefined;
    const operation = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const first = manager.execute('like:video-1', operation);
    const second = manager.execute('like:video-1', operation);
    expect(operation).toHaveBeenCalledTimes(1);

    resolveRequest?.('saved');
    await expect(Promise.all([first, second])).resolves.toEqual([
      'saved',
      'saved',
    ]);
    expect(manager.activeCount).toBe(0);
  });
});
