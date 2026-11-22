export type VideoLikeState = {
  liked: boolean;
  count: number;
};

export type LikeErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'permission'
  | 'video_unavailable'
  | 'conflict'
  | 'unexpected';

export type LikeRealtimeChange = {
  type: 'LIKE_CREATED' | 'LIKE_REMOVED';
  payload: {
    videoId: string;
    userId: string;
  };
};
