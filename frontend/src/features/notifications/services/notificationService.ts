import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import type {
  Notification,
  NotificationEventType,
  NotificationFilter,
  NotificationPage,
  NotificationServiceErrorKind,
} from '../types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pageSize = 30;
const notificationSelection =
  'id,recipient_id,actor_id,event_type,video_id,comment_id,related_user_id,message,read_at,created_at,updated_at,actor:profiles!notifications_actor_id_fkey(id,username,full_name,avatar_url,is_verified)';

type ActorRow = Pick<
  Tables<'profiles'>,
  'id' | 'username' | 'full_name' | 'avatar_url' | 'is_verified'
>;
type NotificationQueryRow = Pick<
  Tables<'notifications'>,
  | 'id'
  | 'recipient_id'
  | 'actor_id'
  | 'event_type'
  | 'video_id'
  | 'comment_id'
  | 'related_user_id'
  | 'message'
  | 'read_at'
  | 'created_at'
  | 'updated_at'
> & {
  actor: ActorRow | null;
};

const filterEventTypes: Partial<
  Record<NotificationFilter, NotificationEventType[]>
> = {
  likes: ['like', 'comment_like'],
  comments: ['comment', 'comment_reply', 'mention'],
  follows: ['follow', 'follow_request', 'follow_accepted'],
  system: ['system', 'admin', 'video_upload_success'],
};

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function normalizeNotificationServiceError(
  error: unknown,
): NotificationServiceError {
  if (error instanceof NotificationServiceError) {
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
      : 'The notification request could not be completed.';
  const lowerMessage = message.toLowerCase();

  if (
    isOffline() ||
    /failed to fetch|network|connection|timeout/.test(lowerMessage)
  ) {
    return new NotificationServiceError(
      'offline',
      'You are offline. Notifications will refresh when you reconnect.',
    );
  }
  if (
    status === 401 ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('sign in')
  ) {
    return new NotificationServiceError(
      'unauthorized',
      'Sign in to view your notifications.',
    );
  }
  if (
    code === 'PGRST116' ||
    code === '02000' ||
    lowerMessage.includes('notification is no longer available')
  ) {
    return new NotificationServiceError(
      'not_found',
      'This notification is no longer available.',
    );
  }
  if (code === '42501' || status === 403) {
    return new NotificationServiceError(
      'permission',
      'You do not have permission to change this notification.',
    );
  }
  return new NotificationServiceError('unexpected', message);
}

function validateUuid(value: string, label: string): void {
  if (!uuidPattern.test(value)) {
    throw new NotificationServiceError(
      label === 'user' ? 'unauthorized' : 'validation',
      label === 'user'
        ? 'Sign in to manage notifications.'
        : 'The notification identifier is invalid.',
    );
  }
}

function toNotification(row: NotificationQueryRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    eventType: row.event_type,
    videoId: row.video_id,
    commentId: row.comment_id,
    relatedUserId: row.related_user_id,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    actor: row.actor
      ? {
          id: row.actor.id,
          username: row.actor.username,
          displayName: row.actor.full_name || row.actor.username,
          avatarUrl: row.actor.avatar_url,
          isVerified: row.actor.is_verified,
        }
      : null,
  };
}

export class NotificationServiceError extends Error {
  constructor(
    readonly kind: NotificationServiceErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

export class NotificationService {
  async getById(userId: string, notificationId: string): Promise<Notification> {
    validateUuid(userId, 'user');
    validateUuid(notificationId, 'notification');
    const supabase = createSupabaseBrowserClient();
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(notificationSelection)
        .eq('recipient_id', userId)
        .eq('id', notificationId)
        .maybeSingle()
        .returns<NotificationQueryRow | null>();
      if (error) {
        throw error;
      }
      if (!data) {
        throw new NotificationServiceError(
          'not_found',
          'This notification is no longer available.',
        );
      }
      return toNotification(data);
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async getPage(
    userId: string,
    filter: NotificationFilter,
    offset: number,
    signal: AbortSignal,
  ): Promise<NotificationPage> {
    validateUuid(userId, 'user');
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !['all', 'likes', 'comments', 'follows', 'system'].includes(filter)
    ) {
      throw new NotificationServiceError(
        'validation',
        'The notification page or filter is invalid.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      let request = supabase
        .from('notifications')
        .select(notificationSelection)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);
      const eventTypes = filterEventTypes[filter];
      if (eventTypes) {
        request = request.in('event_type', eventTypes);
      }

      const { data, error } = await request
        .abortSignal(signal)
        .returns<NotificationQueryRow[]>();
      if (error) {
        throw error;
      }

      const rows = data ?? [];
      return {
        items: rows.map(toNotification),
        nextOffset: rows.length === pageSize ? offset + pageSize : null,
      };
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async getUnreadCount(userId: string, signal: AbortSignal): Promise<number> {
    validateUuid(userId, 'user');
    const supabase = createSupabaseBrowserClient();
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null)
        .abortSignal(signal);
      if (error) {
        throw error;
      }
      return count ?? 0;
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async setReadState(
    userId: string,
    notificationId: string,
    readAt: string | null,
  ): Promise<string | null> {
    validateUuid(userId, 'user');
    validateUuid(notificationId, 'notification');
    if (readAt !== null && !Number.isFinite(Date.parse(readAt))) {
      throw new NotificationServiceError(
        'validation',
        'The notification read timestamp is invalid.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .select('id')
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (data) {
        return readAt;
      }

      const { data: existing, error: readError } = await supabase
        .from('notifications')
        .select('read_at')
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .maybeSingle();
      if (readError) {
        throw readError;
      }
      if (!existing) {
        throw new NotificationServiceError(
          'not_found',
          'This notification is no longer available.',
        );
      }
      return existing.read_at;
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async markAllAsRead(userId: string, readAt: string): Promise<string> {
    validateUuid(userId, 'user');
    if (!Number.isFinite(Date.parse(readAt))) {
      throw new NotificationServiceError(
        'validation',
        'The notification read timestamp is invalid.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('recipient_id', userId)
        .is('read_at', null);
      if (error) {
        throw error;
      }
      return readAt;
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async deleteOwnNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    validateUuid(userId, 'user');
    validateUuid(notificationId, 'notification');
    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .select('id')
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        throw new NotificationServiceError(
          'not_found',
          'This notification is no longer available.',
        );
      }
    } catch (error) {
      throw normalizeNotificationServiceError(error);
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
      throw new NotificationServiceError(
        'unauthorized',
        'Your session changed. Refresh your session before changing notifications.',
      );
    }
  }
}

export const notificationService = new NotificationService();
