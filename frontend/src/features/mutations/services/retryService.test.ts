import { describe, expect, it } from 'vitest';
import { RetryService } from './retryService';

describe('RetryService', () => {
  const retryService = new RetryService(2, 100, 500);

  it('retries network and timeout failures with capped backoff', () => {
    expect(retryService.shouldRetry(0, new TypeError('Failed to fetch'))).toBe(
      true,
    );
    expect(
      retryService.shouldRetry(
        0,
        Object.assign(new Error('Request timed out'), {
          name: 'TimeoutError',
        }),
      ),
    ).toBe(true);
    expect(retryService.delay(4)).toBe(500);
  });

  it('does not retry conflicts or permission failures', () => {
    expect(
      retryService.shouldRetry(
        0,
        Object.assign(new Error('conflict'), {
          status: 409,
        }),
      ),
    ).toBe(false);
    expect(
      retryService.shouldRetry(
        0,
        Object.assign(new Error('forbidden'), { status: 403 }),
      ),
    ).toBe(false);
  });

  it('does not retry unclassified failures or aborted requests', () => {
    expect(
      retryService.shouldRetry(0, new Error('invalid mutation data')),
    ).toBe(false);
    expect(
      retryService.shouldRetry(
        0,
        Object.assign(new Error('request aborted'), { name: 'AbortError' }),
      ),
    ).toBe(false);
  });
});
