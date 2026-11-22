'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShareServiceError, shareService } from '../services/shareService';
import { deepLinkService } from '../services/deepLinkService';
import { trackCreatorAnalyticsEvent } from '../../creator-analytics/services/analyticsEventQueue';
import { useAuth } from '../../auth/hooks/useAuth';

export function useShare(
  videoId: string,
  title = 'A video on Connectly',
  text = 'Take a look at this video on Connectly.',
) {
  const { isAuthenticated, isLoading } = useAuth();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<ShareServiceError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const share = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSharing(true);
    let generatedUrl: string | null = null;
    try {
      const url = deepLinkService.createVideoLinks(videoId).canonicalUrl;
      generatedUrl = url;
      setShareUrl(url);
      const result = await shareService.share({ title, text, url });
      if (result === 'unsupported') {
        setIsDialogOpen(true);
      } else if (result === 'shared') {
        if (isAuthenticated && !isLoading) {
          trackCreatorAnalyticsEvent({
            eventType: 'video_share',
            videoId,
            metadata: { shareMethod: 'native' },
          });
        }
        setSuccessMessage('Video shared.');
      }
    } catch (reason) {
      if (
        reason instanceof ShareServiceError &&
        reason.kind === 'permission' &&
        generatedUrl
      ) {
        setIsDialogOpen(true);
      }
      setError(
        reason instanceof ShareServiceError
          ? reason
          : new ShareServiceError(
              'unexpected',
              reason instanceof Error
                ? reason.message
                : 'The video could not be shared.',
            ),
      );
    } finally {
      setIsSharing(false);
    }
  }, [isAuthenticated, isLoading, text, title, videoId]);

  const onCopied = useCallback(() => {
    if (!isAuthenticated || isLoading) {
      return;
    }
    trackCreatorAnalyticsEvent({
      eventType: 'video_share',
      videoId,
      metadata: { shareMethod: 'copy' },
    });
  }, [isAuthenticated, isLoading, videoId]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setError(null);
  }, []);

  return {
    closeDialog,
    error,
    isDialogOpen,
    isSharing,
    onCopied,
    share,
    shareUrl,
    successMessage,
  };
}
