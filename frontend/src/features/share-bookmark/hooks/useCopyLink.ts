'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardServiceError,
  clipboardService,
} from '../services/clipboardService';

export function useCopyLink() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ClipboardServiceError | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async (url: string): Promise<boolean> => {
    setError(null);
    setCopied(false);
    setIsCopying(true);
    try {
      await clipboardService.copy(url);
      setCopied(true);
      return true;
    } catch (reason) {
      const copyError =
        reason instanceof ClipboardServiceError
          ? reason
          : new ClipboardServiceError(
              'unexpected',
              reason instanceof Error
                ? reason.message
                : 'The link could not be copied.',
            );
      setError(copyError);
      return false;
    } finally {
      setIsCopying(false);
    }
  }, []);

  return { copy, copied, error, isCopying };
}
