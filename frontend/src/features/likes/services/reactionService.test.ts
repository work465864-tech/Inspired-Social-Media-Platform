import { describe, expect, it, vi } from 'vitest';
import type { VideoLikeState } from '../types';
import { LikeServiceError } from './likeService';
import { ReactionService } from './reactionService';

describe('ReactionService', () => {
  it('uses the server-confirmed result for like and unlike intents', async () => {
    const toggleVideoLike = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const service = new ReactionService({ toggleVideoLike });

    await expect(service.setLiked('video-1', 'user-1', true)).resolves.toBe(
      true,
    );
    await expect(service.setLiked('video-1', 'user-1', false)).resolves.toBe(
      false,
    );
    expect(toggleVideoLike).toHaveBeenCalledTimes(2);
  });

  it('reports conflicting server state rather than treating it as success', async () => {
    const service = new ReactionService({
      toggleVideoLike: vi.fn().mockResolvedValue(false),
    });

    await expect(
      service.setLiked('video-1', 'user-1', true),
    ).rejects.toMatchObject<Partial<LikeServiceError>>({ kind: 'conflict' });
  });

  it('applies optimistic and realtime counts without duplicating own updates', () => {
    const service = new ReactionService({ toggleVideoLike: vi.fn() });
    const initial: VideoLikeState = { liked: false, count: 8 };
    const optimisticLike = service.optimisticState(initial, true);

    expect(optimisticLike).toEqual({ liked: true, count: 9 });
    expect(service.optimisticState(optimisticLike, true)).toBe(optimisticLike);

    const realtimeOwnLike = service.applyRealtimeChange(
      optimisticLike,
      'user-1',
      'user-1',
      true,
    );
    expect(realtimeOwnLike).toBe(optimisticLike);

    const realtimeUnlike = service.applyRealtimeChange(
      { liked: false, count: 0 },
      'user-2',
      'user-1',
      false,
    );
    expect(realtimeUnlike).toEqual({ liked: false, count: 0 });

    const unlike = service.optimisticState(optimisticLike, false);
    expect(unlike).toEqual({ liked: false, count: 8 });
  });
});
