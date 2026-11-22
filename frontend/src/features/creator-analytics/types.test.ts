import { describe, expect, it } from 'vitest';
import { creatorAnalyticsBatchSchema } from './types';

const sessionId = 'c0a80123-0000-4000-8000-000000000001';
const profileId = 'c0a80123-0000-4000-8000-000000000002';
const videoId = 'c0a80123-0000-4000-8000-000000000003';
const eventId = 'c0a80123-0000-4000-8000-000000000004';
const playbackId = 'c0a80123-0000-4000-8000-000000000005';
const occurredAt = '2026-11-21T12:00:00.000Z';

describe('creator analytics event schema', () => {
  it('accepts a profile visit without a video target', () => {
    const result = creatorAnalyticsBatchSchema.safeParse({
      events: [
        {
          eventId,
          eventType: 'profile_visit',
          profileId,
          sessionId,
          occurredAt,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('requires a playback id for playback events and rejects extra fields', () => {
    const missingPlayback = creatorAnalyticsBatchSchema.safeParse({
      events: [
        {
          eventId,
          eventType: 'video_start',
          videoId,
          sessionId,
          occurredAt,
        },
      ],
    });
    const extraField = creatorAnalyticsBatchSchema.safeParse({
      events: [
        {
          eventId,
          eventType: 'video_impression',
          videoId,
          sessionId,
          occurredAt,
          creatorId: profileId,
        },
      ],
    });

    expect(missingPlayback.success).toBe(false);
    expect(extraField.success).toBe(false);
  });

  it('bounds batch size and watch intervals', () => {
    const watchEvent = {
      eventId,
      eventType: 'video_watch',
      videoId,
      playbackId,
      sessionId,
      occurredAt,
      watchMs: 60_001,
    };

    expect(
      creatorAnalyticsBatchSchema.safeParse({ events: [watchEvent] }).success,
    ).toBe(false);
    expect(
      creatorAnalyticsBatchSchema.safeParse({
        events: Array.from({ length: 51 }, (_, index) => ({
          ...watchEvent,
          eventId: `c0a80123-0000-4000-8000-${String(index).padStart(12, '0')}`,
          watchMs: 1000,
        })),
      }).success,
    ).toBe(false);
  });
});
