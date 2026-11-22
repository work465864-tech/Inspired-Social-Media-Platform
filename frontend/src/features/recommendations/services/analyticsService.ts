import { maxBufferedAnalyticsEvents } from '../constants';
import type {
  RecordedRecommendationEvent,
  RecommendationAnalyticsSink,
  RecommendationEventInput,
} from '../types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class RecommendationAnalyticsService {
  private readonly events: RecordedRecommendationEvent[] = [];
  private sink: RecommendationAnalyticsSink | null = null;
  private flushPromise: Promise<number> | null = null;

  setSink(sink: RecommendationAnalyticsSink): void {
    this.sink = sink;
  }

  clearSink(): void {
    this.sink = null;
  }

  record(input: RecommendationEventInput): RecordedRecommendationEvent {
    if (!uuidPattern.test(input.userId) || !uuidPattern.test(input.videoId)) {
      throw new Error(
        'Recommendation analytics requires valid user and video IDs.',
      );
    }
    if (input.sessionId.trim().length === 0 || input.sessionId.length > 128) {
      throw new Error('Recommendation analytics requires a valid session ID.');
    }
    if (
      (input.type === 'impression' &&
        (!Number.isSafeInteger(input.position) || input.position < 0)) ||
      (input.type === 'watch_duration' &&
        (!Number.isFinite(input.durationMs) || input.durationMs < 0))
    ) {
      throw new Error(
        'Recommendation analytics contains an invalid measurement.',
      );
    }

    const eventId = globalThis.crypto?.randomUUID?.();
    if (!eventId) {
      throw new Error(
        'Secure analytics event IDs are unavailable in this runtime.',
      );
    }

    const event: RecordedRecommendationEvent = {
      ...input,
      eventId,
      occurredAt: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > maxBufferedAnalyticsEvents) {
      this.events.splice(0, this.events.length - maxBufferedAnalyticsEvents);
    }
    return event;
  }

  async flush(): Promise<number> {
    if (this.flushPromise) {
      return this.flushPromise;
    }
    if (!this.sink) {
      throw new Error(
        'Recommendation analytics has no configured delivery sink.',
      );
    }
    if (this.events.length === 0) {
      return 0;
    }

    const batch = [...this.events];
    const sink = this.sink;
    this.flushPromise = sink(batch)
      .then(() => {
        const batchIds = new Set(batch.map((event) => event.eventId));
        const remaining = this.events.filter(
          (event) => !batchIds.has(event.eventId),
        );
        this.events.splice(0, this.events.length, ...remaining);
        return batch.length;
      })
      .finally(() => {
        this.flushPromise = null;
      });

    return this.flushPromise;
  }

  getBufferedCount(): number {
    return this.events.length;
  }
}

export const recommendationAnalyticsService =
  new RecommendationAnalyticsService();
