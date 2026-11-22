import 'server-only';

import { analyticsService } from '../../creator-analytics/services/AnalyticsService';
import type { CreatorAnalyticsRange } from '../../creator-analytics/types';

export class DashboardService {
  getSnapshot(creatorId: string, range: CreatorAnalyticsRange) {
    return analyticsService.getSnapshot(creatorId, range);
  }
}

export const dashboardService = new DashboardService();
