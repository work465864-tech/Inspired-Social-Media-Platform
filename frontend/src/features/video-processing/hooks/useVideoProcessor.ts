'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeProcessingError } from '../services/processingErrorService';
import { videoProcessorService } from '../services/videoProcessorService';
import type {
  ProcessingProgress,
  ProcessingStatus,
  ProcessingStage,
  VideoProcessingOptions,
  VideoProcessingResult,
} from '../types/processing';

export function useVideoProcessor() {
  const controllerRef = useRef<AbortController | null>(null);
  const stageRef = useRef<ProcessingStage>('queued');
  const lastRequestRef = useRef<{
    file: File;
    options: VideoProcessingOptions;
  } | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('queued');
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'queued',
    percentage: 0,
  });
  const [result, setResult] = useState<VideoProcessingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const process = useCallback(
    async (
      file: File,
      options: VideoProcessingOptions = {},
    ): Promise<VideoProcessingResult> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      lastRequestRef.current = { file, options };
      stageRef.current = 'validating';
      setStatus('processing');
      setProgress({ stage: 'validating', percentage: 0 });
      setResult(null);
      setError(null);

      try {
        const processed = await videoProcessorService.process(
          file,
          options,
          controller.signal,
          (nextProgress) => {
            if (controllerRef.current === controller) {
              stageRef.current = nextProgress.stage;
              setProgress(nextProgress);
            }
          },
        );
        if (controllerRef.current === controller) {
          setStatus('completed');
          setProgress({ stage: 'completed', percentage: 100 });
          setResult(processed);
        }
        return processed;
      } catch (caughtError) {
        const normalized = normalizeProcessingError(
          caughtError,
          stageRef.current,
        );
        if (controllerRef.current === controller) {
          setStatus(normalized.code === 'cancelled' ? 'cancelled' : 'failed');
          setError(normalized);
        }
        throw normalized;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const retry = useCallback(() => {
    const request = lastRequestRef.current;
    if (!request || (status !== 'failed' && status !== 'cancelled')) {
      return Promise.reject(
        new Error(
          'There is no failed or cancelled processing request to retry.',
        ),
      );
    }
    return process(request.file, request.options);
  }, [process, status]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    lastRequestRef.current = null;
    setStatus('queued');
    setProgress({ stage: 'queued', percentage: 0 });
    setResult(null);
    setError(null);
  }, []);

  return { cancel, error, process, progress, reset, result, retry, status };
}
