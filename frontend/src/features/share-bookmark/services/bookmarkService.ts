import type { InfiniteData } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { mediaService } from '../../feed/services/mediaService';
import { videoService } from '../../feed/services/videoService';
import type { BookmarkErrorKind, BookmarkPage } from '../types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pageSize = 24;

type BookmarkReference = {
  video_id: string;
  created_at: string;
};

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function normalizeError(error: unknown): BookmarkServiceError {
  if (error instanceof BookmarkServiceError) {
    return error;
  }

  const record =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown; status?: unknown })
      : undefined;
  const code = typeof record?.code === 'string' ? record.code : '';
  const status = typeof record?.status === 'number' ? record.status : undefined;
  const message =
    typeof record?.message === 'string'
      ? record.message
      : 'The bookmark request could not be completed.';
  const normalizedMessage = message.toLowerCase();

  if (
    isOffline() ||
    /failed to fetch|network|connection|timeout/.test(normalizedMessage)
  ) {
    return new BookmarkServiceError(
      'offline',
      'You are offline. Reconnect and try bookmarking again.',
    );
  }
  if (
    status === 401 ||
    normalizedMessage.includes('authentication') ||
    normalizedMessage.includes('sign in')
  ) {
    return new BookmarkServiceError(
      'unauthorized',
      'Sign in to save videos to your bookmarks.',
    );
  }
  if (
    normalizedMessage.includes('not available for bookmarking') ||
    normalizedMessage.includes('video not found')
  ) {
    return new BookmarkServiceError(
      'video_unavailable',
      'This video is no longer available for bookmarking.',
    );
  }
  if (code === '42501' || status === 403) {
    return new BookmarkServiceError(
      'permission',
      'You do not have permission to bookmark this video.',
    );
  }
  return new BookmarkServiceError('unexpected', message);
}

function validateId(value: string, label: 'video' | 'user'): void {
  if (!uuidPattern.test(value)) {
    throw new BookmarkServiceError(
      label === 'user' ? 'unauthorized' : 'video_unavailable',
      label === 'user'
        ? 'Sign in to manage your bookmarks.'
        : 'This video is no longer available for bookmarking.',
    );
  }
}

export class BookmarkServiceError extends Error {
  constructor(
    readonly kind: BookmarkErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'BookmarkServiceError';
  }
}

export class BookmarkService {
  async getState(
    videoId: string,
    expectedUserId: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    validateId(videoId, 'video');
    validateId(expectedUserId, 'user');
    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('video_id')
        .eq('video_id', videoId)
        .eq('user_id', expectedUserId)
        .abortSignal(signal)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data !== null;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async setBookmarked(
    videoId: string,
    expectedUserId: string,
    desiredState: boolean,
  ): Promise<boolean> {
    validateId(videoId, 'video');
    validateId(expectedUserId, 'user');
    const supabase = createSupabaseBrowserClient();

    try {
      await this.assertCurrentUser(supabase, expectedUserId);
      const { data, error } = await supabase.rpc('toggle_bookmark', {
        target_video_id: videoId,
      });

      if (error) {
        throw error;
      }
      if (typeof data !== 'boolean') {
        throw new BookmarkServiceError(
          'unexpected',
          'The server returned an invalid bookmark state.',
        );
      }
      if (data !== desiredState) {
        throw new BookmarkServiceError(
          'conflict',
          'The bookmark changed elsewhere. The latest state is being refreshed.',
        );
      }
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async getPage(
    expectedUserId: string,
    offset: number,
    signal: AbortSignal,
  ): Promise<BookmarkPage> {
    validateId(expectedUserId, 'user');
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new BookmarkServiceError(
        'unexpected',
        'The bookmark page is invalid.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, expectedUserId);
      const { data, error } = await supabase
        .from('bookmarks')
        .select('video_id,created_at')
        .eq('user_id', expectedUserId)
        .order('created_at', { ascending: false })
        .order('video_id', { ascending: false })
        .range(offset, offset + pageSize - 1)
        .abortSignal(signal)
        .returns<BookmarkReference[]>();

      if (error) {
        throw error;
      }

      const references = data ?? [];
      const videos = await videoService.getByIds(
        references.map((reference) => reference.video_id),
        signal,
      );
      const hydratedVideos = await mediaService.hydrateThumbnails(
        videos,
        signal,
      );
      const videosById = new Map(
        hydratedVideos.map((video) => [video.id, video]),
      );

      return {
        items: references.flatMap((reference) => {
          const video = videosById.get(reference.video_id);
          return video
            ? [
                {
                  videoId: reference.video_id,
                  createdAt: reference.created_at,
                  video,
                },
              ]
            : [];
        }),
        nextOffset: references.length === pageSize ? offset + pageSize : null,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  private async assertCurrentUser(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    expectedUserId: string,
  ): Promise<void> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    if (data.user?.id !== expectedUserId) {
      throw new BookmarkServiceError(
        'unauthorized',
        'Your session changed. Refresh your session before managing bookmarks.',
      );
    }
  }
}

export function removeBookmarkedVideo(
  current: InfiniteData<BookmarkPage, number> | undefined,
  videoId: string,
): InfiniteData<BookmarkPage, number> | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.videoId !== videoId),
    })),
  };
}

export const bookmarkService = new BookmarkService();
