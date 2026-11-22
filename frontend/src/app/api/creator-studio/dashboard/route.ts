import { NextResponse } from 'next/server';
import {
  CreatorApiError,
  creatorApiErrorResponse,
  requireCreatorUser,
} from '../../../../features/creator-studio/services/creatorApiService';
import { dashboardService } from '../../../../features/creator-studio/services/DashboardService';
import type { CreatorAnalyticsRange } from '../../../../features/creator-analytics/types';

const ranges: CreatorAnalyticsRange[] = ['7d', '30d', '90d'];

export async function GET(request: Request) {
  try {
    const { user } = await requireCreatorUser();
    const range = new URL(request.url).searchParams.get('range') ?? '30d';
    if (!ranges.includes(range as CreatorAnalyticsRange)) {
      throw new CreatorApiError(
        400,
        'invalid_range',
        'Choose an analytics range of 7, 30, or 90 days.',
      );
    }
    const snapshot = await dashboardService.getSnapshot(
      user.id,
      range as CreatorAnalyticsRange,
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    return creatorApiErrorResponse(error);
  }
}
