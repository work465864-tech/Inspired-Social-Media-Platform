import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Json } from '../../../types/database.types';
import {
  NotificationServiceError,
  normalizeNotificationServiceError,
} from './notificationService';
import type { NotificationPreferences } from '../types';

const defaultPreferences: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  push: true,
  email: true,
};

export function parseNotificationPreferences(
  value: Json | null | undefined,
): NotificationPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...defaultPreferences };
  }
  return {
    likes: typeof value.likes === 'boolean' ? value.likes : true,
    comments: typeof value.comments === 'boolean' ? value.comments : true,
    follows: typeof value.follows === 'boolean' ? value.follows : true,
    push: typeof value.push === 'boolean' ? value.push : true,
    email: typeof value.email === 'boolean' ? value.email : true,
  };
}

export class NotificationPreferenceService {
  async get(userId: string): Promise<NotificationPreferences> {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('user_settings')
        .select('notifications')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return parseNotificationPreferences(data?.notifications);
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }

  async update(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    if (!userId) {
      throw new NotificationServiceError(
        'unauthorized',
        'Sign in to update notification preferences.',
      );
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }
      if (authData.user?.id !== userId) {
        throw new NotificationServiceError(
          'unauthorized',
          'Your session changed. Refresh your session before updating preferences.',
        );
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: userId,
            notifications: preferences satisfies Json,
          },
          { onConflict: 'user_id' },
        )
        .select('notifications')
        .single();
      if (error) {
        throw error;
      }
      return parseNotificationPreferences(data.notifications);
    } catch (error) {
      throw normalizeNotificationServiceError(error);
    }
  }
}

export const notificationPreferenceService =
  new NotificationPreferenceService();
