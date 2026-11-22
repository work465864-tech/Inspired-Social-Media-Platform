'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { usePresence } from '../hooks/usePresence';
import { useSubscription } from '../hooks/useSubscription';
import { feedRealtimeService } from '../services/feedRealtimeService';
import { followRealtimeService } from '../services/followRealtimeService';
import { useRealtimeContext } from '../../../providers/RealtimeProvider';
import type { RealtimeChannelSetup } from '../types/subscription';

type UserPresence = {
  userId: string;
  onlineAt: string;
};

export function RealtimeSyncListener() {
  const { isLoading, user } = useAuth();
  const { service } = useRealtimeContext();
  const userId = user?.id ?? null;
  const enabled = !isLoading && userId !== null;
  const setupVideos = useCallback<RealtimeChannelSetup>(
    (channel, events) => feedRealtimeService.setup(channel, events),
    [],
  );
  useSubscription('feed:videos', 'videos:feed', setupVideos, !isLoading);
  const setupFollows = useCallback<RealtimeChannelSetup>(
    (channel, events) => {
      if (userId) {
        followRealtimeService.setup(channel, events, userId);
      }
    },
    [userId],
  );
  useSubscription(
    `follows:${userId ?? 'anonymous'}`,
    'follows:participants',
    setupFollows,
    enabled,
  );

  const onlineAt = useRef(new Date().toISOString());
  const presencePayload = useMemo<UserPresence>(
    () => ({ userId: userId ?? '', onlineAt: onlineAt.current }),
    [userId],
  );
  const presence = usePresence(
    'connectly:online-users',
    userId ?? 'anonymous',
    presencePayload,
    enabled,
  );
  const trackedUserId = useRef<string | null>(null);
  const knownUsers = useRef(new Map<string, string>());

  useEffect(() => {
    if (!service) {
      return;
    }
    if (!enabled || !userId) {
      trackedUserId.current = null;
      knownUsers.current.clear();
      return;
    }
    if (trackedUserId.current !== userId) {
      trackedUserId.current = userId;
      knownUsers.current.clear();
    }
    if (presence.status !== 'connected' || !presence.synced) {
      return;
    }

    const currentUsers = new Map<string, string>();
    for (const entries of Object.values(presence.state)) {
      for (const entry of entries) {
        if (entry.userId && entry.userId !== userId) {
          currentUsers.set(entry.userId, entry.onlineAt);
        }
      }
    }
    for (const [otherUserId, joinedAt] of currentUsers) {
      if (!knownUsers.current.has(otherUserId)) {
        service.dispatch('USER_ONLINE', {
          userId: otherUserId,
          onlineAt: joinedAt,
        });
      }
    }
    for (const otherUserId of knownUsers.current.keys()) {
      if (!currentUsers.has(otherUserId)) {
        service.dispatch('USER_OFFLINE', {
          userId: otherUserId,
          lastSeenAt: new Date().toISOString(),
        });
      }
    }
    knownUsers.current = currentUsers;
  }, [
    enabled,
    presence.state,
    presence.status,
    presence.synced,
    service,
    userId,
  ]);

  return null;
}
