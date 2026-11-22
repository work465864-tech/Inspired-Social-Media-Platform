'use client';

import { useCallback, useRef, useState } from 'react';
import { useToast } from '../../../providers/ToastProvider';
import {
  getOAuthAuthorizationUrl,
  type OAuthProvider,
} from '../services/oauthService';
import { getAuthErrorMessage } from '../utils/authErrorMessage';

export function useOAuth() {
  const showToast = useToast();
  const requestInProgress = useRef(false);
  const [processingProvider, setProcessingProvider] =
    useState<OAuthProvider | null>(null);

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      if (requestInProgress.current) {
        return;
      }

      requestInProgress.current = true;
      setProcessingProvider(provider);

      try {
        const authorizationUrl = await getOAuthAuthorizationUrl(provider);
        window.location.assign(authorizationUrl);
      } catch (error) {
        requestInProgress.current = false;
        setProcessingProvider(null);
        showToast({
          title: 'OAuth sign-in failed',
          description: getAuthErrorMessage(error, 'oauth'),
          variant: 'error',
        });
      }
    },
    [showToast],
  );

  return {
    processingProvider,
    signInWithProvider,
  };
}
