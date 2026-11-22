import 'server-only';

import { createHmac } from 'node:crypto';
import { createUploadAdminClient } from '../../upload/services/uploadServerService';
import {
  CreatorApiError,
  requireCreatorUser,
} from '../../creator-studio/services/creatorApiService';
import {
  creatorAnalyticsBatchSchema,
  type CreatorAnalyticsEvent,
} from '../types';

function visitorKey(userId: string): string {
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new CreatorApiError(
      503,
      'analytics_not_configured',
      'Analytics ingestion is not configured on the server.',
    );
  }

  return createHmac('sha256', secret).update(`user:${userId}`).digest('hex');
}

export class AnalyticsIngestionService {
  async ingest(payload: unknown): Promise<number> {
    const parsed = creatorAnalyticsBatchSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CreatorApiError(
        400,
        'invalid_analytics_batch',
        'The analytics batch contains invalid events.',
      );
    }

    const { supabase, user } = await requireCreatorUser();
    const events = parsed.data.events;
    const videoIds = [
      ...new Set(
        events.flatMap((event) => (event.videoId ? [event.videoId] : [])),
      ),
    ];
    const profileIds = [
      ...new Set(
        events.flatMap((event) => (event.profileId ? [event.profileId] : [])),
      ),
    ];
    const visibleVideos = new Map<string, string>();
    const availableProfiles = new Set<string>();

    if (videoIds.length > 0) {
      const { data, error } = await supabase
        .from('videos')
        .select('id,user_id')
        .in('id', videoIds)
        .eq('status', 'ready')
        .is('deleted_at', null);
      if (error) {
        throw new CreatorApiError(
          503,
          'analytics_target_check_failed',
          'Video analytics targets could not be verified.',
        );
      }
      for (const row of data ?? []) {
        visibleVideos.set(row.id, row.user_id);
      }
    }

    if (profileIds.length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .in('id', profileIds)
        .eq('status', 'active');
      if (error) {
        throw new CreatorApiError(
          503,
          'analytics_target_check_failed',
          'Profile analytics targets could not be verified.',
        );
      }
      for (const row of data ?? []) {
        availableProfiles.add(row.id);
      }
    }

    const trustedEvents = events.flatMap((event: CreatorAnalyticsEvent) => {
      const creatorId = event.videoId
        ? visibleVideos.get(event.videoId)
        : event.profileId;
      const targetIsAvailable = event.videoId
        ? visibleVideos.has(event.videoId)
        : event.profileId !== undefined &&
          availableProfiles.has(event.profileId);
      if (
        !creatorId ||
        !targetIsAvailable ||
        creatorId === user.id ||
        (event.eventType === 'profile_visit' && event.profileId === user.id)
      ) {
        return [];
      }

      const occurredAt = new Date(event.occurredAt);
      if (
        !Number.isFinite(occurredAt.getTime()) ||
        occurredAt.getTime() < Date.now() - 60 * 60 * 1000 ||
        occurredAt.getTime() > Date.now() + 60 * 1000
      ) {
        return [];
      }

      return [
        {
          event_id: event.eventId,
          event_type: event.eventType,
          creator_id: creatorId,
          video_id: event.videoId ?? null,
          viewer_key: visitorKey(user.id),
          viewer_kind: 'authenticated',
          session_id: event.sessionId,
          playback_id: event.playbackId ?? null,
          viewer_id: event.eventType === 'video_start' ? user.id : null,
          occurred_at: occurredAt.toISOString(),
          watch_ms: event.watchMs ?? 0,
          position_ms: event.positionMs ?? null,
          duration_ms: event.durationMs ?? null,
          metadata: event.metadata ?? {},
        },
      ];
    });

    if (trustedEvents.length === 0) {
      return 0;
    }

    const admin = createUploadAdminClient();
    const { data, error } = await admin.rpc('ingest_creator_analytics_events', {
      p_events: trustedEvents,
    });
    if (error) {
      console.error('Creator analytics ingestion failed:', error.code);
      if (error.code === 'P0001') {
        throw new CreatorApiError(
          429,
          'analytics_rate_limited',
          'Too many analytics events were sent. Please retry shortly.',
        );
      }
      throw new CreatorApiError(
        503,
        'analytics_ingestion_failed',
        'Analytics events could not be saved.',
      );
    }

    return data;
  }
}

export const analyticsIngestionService = new AnalyticsIngestionService();
