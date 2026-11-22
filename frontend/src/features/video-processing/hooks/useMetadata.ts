'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoFormat } from '../../upload/constants/uploadConfig';
import { metadataService } from '../services/metadataService';
import { normalizeProcessingError } from '../services/processingErrorService';
import type { MediaMetadata } from '../../../types/media';

export function useMetadata() {
  const controllerRef = useRef<AbortController | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const extract = useCallback(async (file: File, sourceFormat: VideoFormat) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setMetadata(null);
    setError(null);
    try {
      const result = await metadataService.extract(
        file,
        sourceFormat,
        controller.signal,
      );
      if (controllerRef.current === controller) {
        setMetadata(result);
      }
      return result;
    } catch (caughtError) {
      const normalized = normalizeProcessingError(caughtError, 'metadata');
      if (controllerRef.current === controller) {
        setError(normalized);
      }
      throw normalized;
    } finally {
      if (controllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { cancel, error, extract, isLoading, metadata };
}
