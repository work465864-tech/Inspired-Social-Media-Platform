import { describe, expect, it } from 'vitest';
import { MutationQueue } from './mutationQueue';

describe('MutationQueue', () => {
  it('holds mutations offline and resumes them when connectivity returns', async () => {
    const queue = new MutationQueue();
    queue.setOnlineStatus(false);
    const request = queue.enqueue(async () => 'synced');

    expect(queue.getSnapshot()).toMatchObject({
      pendingCount: 1,
      isOnline: false,
    });

    queue.setOnlineStatus(true);
    await expect(request).resolves.toBe('synced');
    expect(queue.getSnapshot()).toMatchObject({
      pendingCount: 0,
      isOnline: true,
      isProcessing: false,
    });

    queue.dispose();
  });
});
