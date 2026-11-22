'use client';

import { useCallback, useState } from 'react';
import { ffmpegService } from '../services/ffmpegService';
import { normalizeProcessingError } from '../services/processingErrorService';

export function useFFmpeg() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const loadSignal = signal ?? new AbortController().signal;
    setIsLoading(true);
    setError(null);
    try {
      await ffmpegService.load(loadSignal);
    } catch (caughtError) {
      const normalized = normalizeProcessingError(caughtError, 'metadata');
      setError(normalized);
      throw normalized;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const terminate = useCallback(() => ffmpegService.terminate(), []);

  return {
    error,
    isLoaded: ffmpegService.isLoaded,
    isLoading,
    load,
    terminate,
  };
}
