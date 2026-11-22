import type { VideoLikeState } from '../types';
import { likeService, LikeServiceError, type LikeService } from './likeService';

export class ReactionService {
  constructor(private readonly likes: Pick<LikeService, 'toggleVideoLike'>) {}

  async setLiked(
    videoId: string,
    userId: string,
    desiredState: boolean,
  ): Promise<boolean> {
    const actualState = await this.likes.toggleVideoLike(videoId, userId);
    if (actualState !== desiredState) {
      throw new LikeServiceError(
        'conflict',
        'The like state changed elsewhere. The latest state is being refreshed.',
      );
    }
    return actualState;
  }

  optimisticState(
    current: VideoLikeState | undefined,
    desiredState: boolean,
  ): VideoLikeState {
    if (!current) {
      return { liked: desiredState, count: desiredState ? 1 : 0 };
    }
    if (current.liked === desiredState) {
      return current;
    }
    return {
      liked: desiredState,
      count: Math.max(0, current.count + (desiredState ? 1 : -1)),
    };
  }

  applyRealtimeChange(
    current: VideoLikeState | undefined,
    actorId: string,
    currentUserId: string | null,
    desiredState: boolean,
  ): VideoLikeState | undefined {
    if (
      !current ||
      (actorId === currentUserId && current.liked === desiredState)
    ) {
      return current;
    }
    return {
      liked: actorId === currentUserId ? desiredState : current.liked,
      count: Math.max(0, current.count + (desiredState ? 1 : -1)),
    };
  }
}

export const reactionService = new ReactionService(likeService);
