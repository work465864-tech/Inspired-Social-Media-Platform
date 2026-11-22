import 'server-only';

import { createUploadAdminClient } from '../../upload/services/uploadServerService';
import { CreatorApiError } from '../../creator-studio/services/creatorApiService';
import {
  creatorAnalyticsSnapshotSchema,
  type CreatorAnalyticsRange,
} from '../types';

const rangeDays: Record<CreatorAnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function utcDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export class AnalyticsService {
  async getSnapshot(creatorId: string, range: CreatorAnalyticsRange) {
    const admin = createUploadAdminClient();
    const days = rangeDays[range];
    const { data, error } = await admin.rpc('get_creator_dashboard_snapshot', {
      target_creator_id: creatorId,
      range_start: utcDate(days - 1),
      range_end: utcDate(0),
    });

    if (error) {
      throw new CreatorApiError(
        503,
        'analytics_unavailable',
        'Creator analytics are temporarily unavailable.',
      );
    }

    const parsed = creatorAnalyticsSnapshotSchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        'Creator analytics snapshot returned an invalid shape:',
        parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
      );
      throw new CreatorApiError(
        502,
        'invalid_analytics_response',
        'Creator analytics could not be validated.',
      );
    }

    const { totals } = parsed.data;
    const engagementRate =
      totals.views === 0
        ? 0
        : ((totals.likes + totals.comments) / totals.views) * 100;

    return { ...parsed.data, engagementRate };
  }
}

export const analyticsService = new AnalyticsService();
