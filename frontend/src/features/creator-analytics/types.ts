import { z } from 'zod';

export const creatorAnalyticsEventTypes = [
  'profile_visit',
  'video_impression',
  'video_start',
  'video_watch',
  'video_finish',
  'video_share',
] as const;

export type CreatorAnalyticsEventType =
  (typeof creatorAnalyticsEventTypes)[number];

export type CreatorAnalyticsEventInput = {
  eventId: string;
  eventType: CreatorAnalyticsEventType;
  profileId?: string;
  videoId?: string;
  sessionId: string;
  playbackId?: string;
  occurredAt: string;
  watchMs?: number;
  positionMs?: number;
  durationMs?: number;
  metadata?: { shareMethod?: 'native' | 'copy' | 'external' };
};

const analyticsUuidSchema = z.string().uuid();

export const creatorAnalyticsEventSchema = z
  .object({
    eventId: analyticsUuidSchema,
    eventType: z.enum(creatorAnalyticsEventTypes),
    profileId: analyticsUuidSchema.optional(),
    videoId: analyticsUuidSchema.optional(),
    sessionId: analyticsUuidSchema,
    playbackId: analyticsUuidSchema.optional(),
    occurredAt: z.string().datetime({ offset: true }),
    watchMs: z.number().int().min(0).max(60_000).optional(),
    positionMs: z.number().int().min(0).optional(),
    durationMs: z.number().int().positive().optional(),
    metadata: z
      .object({
        shareMethod: z.enum(['native', 'copy', 'external']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((event, context) => {
    const isProfileVisit = event.eventType === 'profile_visit';
    const requiresPlayback = [
      'video_start',
      'video_watch',
      'video_finish',
    ].includes(event.eventType);
    if (
      isProfileVisit
        ? !event.profileId || event.videoId
        : !event.videoId || event.profileId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A valid analytics target is required.',
      });
    }
    if (requiresPlayback !== Boolean(event.playbackId)) {
      context.addIssue({
        code: 'custom',
        message: 'The playback identifier does not match the event type.',
      });
    }
    if (
      (event.eventType !== 'video_watch' && event.watchMs !== undefined) ||
      (!requiresPlayback &&
        (event.positionMs !== undefined || event.durationMs !== undefined)) ||
      (event.eventType !== 'video_share' && event.metadata !== undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Playback and share metadata do not match the event type.',
      });
    }
  });

export type CreatorAnalyticsEvent = z.infer<typeof creatorAnalyticsEventSchema>;

export const creatorAnalyticsBatchSchema = z
  .object({ events: z.array(creatorAnalyticsEventSchema).min(1).max(50) })
  .strict();

const summaryNumber = z.number().finite().nonnegative();

export const creatorAnalyticsSnapshotSchema = z.object({
  totals: z.object({
    videos: summaryNumber,
    drafts: summaryNumber,
    views: summaryNumber,
    likes: summaryNumber,
    comments: summaryNumber,
  }),
  followers: summaryNumber,
  following: summaryNumber,
  analytics: z.object({
    impressions: summaryNumber,
    starts: summaryNumber,
    finishes: summaryNumber,
    shares: summaryNumber,
    profileVisits: summaryNumber,
    repeatViews: summaryNumber,
    watchMs: summaryNumber,
    uniqueViewers: summaryNumber,
    completionRate: summaryNumber,
    viewThroughRate: summaryNumber,
    averageWatchMs: summaryNumber,
    averageSessionWatchMs: summaryNumber,
  }),
  series: z.array(
    z.object({
      day: z.string(),
      views: summaryNumber,
      impressions: summaryNumber,
      watchMs: summaryNumber,
      followers: summaryNumber,
    }),
  ),
});

export type CreatorAnalyticsSnapshot = z.infer<
  typeof creatorAnalyticsSnapshotSchema
>;
export type CreatorAnalyticsRange = '7d' | '30d' | '90d';
