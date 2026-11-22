import { describe, expect, it, vi } from 'vitest';
import { RecommendationAnalyticsService } from './analyticsService';

describe('RecommendationAnalyticsService', () => {
  it('retains failed batches and removes events only after a successful flush', async () => {
    const service = new RecommendationAnalyticsService();
    const sink = vi.fn().mockRejectedValueOnce(new Error('delivery failed'));
    service.setSink(sink);
    service.record({
      type: 'impression',
      userId: 'c0d3a43a-b378-4b89-9a7f-4d54d05a7c12',
      videoId: 'd0d3a43a-b378-4b89-9a7f-4d54d05a7c12',
      sessionId: 'session-1',
      position: 0,
    });

    await expect(service.flush()).rejects.toThrow('delivery failed');
    expect(service.getBufferedCount()).toBe(1);

    sink.mockResolvedValue(undefined);
    await expect(service.flush()).resolves.toBe(1);
    expect(service.getBufferedCount()).toBe(0);
  });
});
