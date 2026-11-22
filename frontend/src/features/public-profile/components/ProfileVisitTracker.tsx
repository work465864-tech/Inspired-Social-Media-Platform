'use client';

import { useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { trackCreatorAnalyticsEvent } from '../../creator-analytics/services/analyticsEventQueue';

const debounceWindowMs = 30 * 60 * 1000;
const lastVisits = new Map<string, number>();

export function ProfileVisitTracker({ profileId }: { profileId: string }) {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || !user || user.id === profileId) {
      return;
    }

    const key = `${user.id}:${profileId}`;
    const now = Date.now();
    const lastVisitAt = lastVisits.get(key) ?? 0;
    if (now - lastVisitAt < debounceWindowMs) {
      return;
    }

    lastVisits.set(key, now);
    trackCreatorAnalyticsEvent({
      eventType: 'profile_visit',
      profileId,
    });
  }, [isLoading, profileId, user]);

  return null;
}
