import type { Tables } from '../../../types/database.types';
import type { Json } from '../../../types/database.types';

export type CommentAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
};

export type Comment = {
  id: string;
  videoId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  likesCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor | null;
};

export type CommentQueryRow = Tables<'comments'> & {
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};

export type CommentPage = {
  items: Comment[];
  totalCount: number;
  nextOffset: number | null;
};

export type CommentErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'permission'
  | 'video_unavailable'
  | 'comment_unavailable'
  | 'validation'
  | 'unexpected';

export type CommentRealtimeChange =
  | {
      type: 'COMMENT_CREATED';
      payload: { commentId: string; videoId: string; authorId: string };
    }
  | {
      type: 'COMMENT_UPDATED';
      payload: { commentId: string; videoId: string; changes: Json };
    }
  | {
      type: 'COMMENT_DELETED';
      payload: { commentId: string; videoId: string };
    };
