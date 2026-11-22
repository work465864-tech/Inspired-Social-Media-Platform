import { describe, expect, it, vi } from 'vitest';
import { SubscriptionRegistry } from './subscriptionRegistry';

describe('SubscriptionRegistry', () => {
  it('starts one subscription and cleans it up after the final release', () => {
    const cleanup = vi.fn();
    const start = vi.fn(() => cleanup);
    const registry = new SubscriptionRegistry(vi.fn());

    const releaseFirst = registry.acquire('feed', 'feed:public', start);
    const releaseSecond = registry.acquire('feed', 'feed:public', start);

    expect(start).toHaveBeenCalledTimes(1);
    expect(registry.size).toBe(1);

    releaseFirst();
    expect(cleanup).not.toHaveBeenCalled();

    releaseSecond();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(registry.size).toBe(0);
  });

  it('rejects reusing a key with different subscription options', () => {
    const registry = new SubscriptionRegistry(vi.fn());
    const release = registry.acquire('feed', 'feed:public', () => vi.fn());

    expect(() =>
      registry.acquire('feed', 'feed:private', () => vi.fn()),
    ).toThrow(/different options/);

    release();
  });
});
