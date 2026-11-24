'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { thumbnailGenerator } from '../services/thumbnailGenerator';
import { normalizeProcessingError } from '../services/processingErrorService';
import type { GeneratedThumbnails } from '../types/processing';
import type { VideoFormat } from '../../upload/constants/uploadConfig';

export function useThumbnailGenerator() {
  const controllerRef = useRef<AbortController | null>(null);
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnails | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const generate = useCallback(
    async (
      file: File,
      sourceFormat: VideoFormat,
      durationMs: number,
      captureTimeMs?: number,
    ) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsGenerating(true);
      setThumbnails(null);
      setError(null);
      try {
        const result = await thumbnailGenerator.generate(
          file,
          sourceFormat,
          durationMs,
          controller.signal,
          captureTimeMs,
        );
        if (controllerRef.current === controller) {
          setThumbnails(result);
        }
        return result;
      } catch (caughtError) {
        const normalized = normalizeProcessingError(caughtError, 'thumbnail');
        if (controllerRef.current === controller) {
          setError(normalized);
        }
        throw normalized;
      } finally {
        if (controllerRef.current === controller) {
          setIsGenerating(false);
        }
      }
    },
    [],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setThumbnails(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return { cancel, error, generate, isGenerating, reset, thumbnails };
}
