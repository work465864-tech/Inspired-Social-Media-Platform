'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeProcessingError } from '../services/processingErrorService';
import { videoProcessorService } from '../services/videoProcessorService';
import type {
  ProcessingQueueItem,
  ProcessingProgress,
  VideoProcessingOptions,
} from '../types/processing';

export function useProcessingQueue() {
  const [items, setItems] = useState<ProcessingQueueItem[]>([]);
  const itemsRef = useRef<ProcessingQueueItem[]>([]);
  const requestsRef = useRef(
    new Map<string, { file: File; options: VideoProcessingOptions }>(),
  );
  const pendingRef = useRef<string[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const commit = useCallback(
    (update: (current: ProcessingQueueItem[]) => ProcessingQueueItem[]) => {
      const next = update(itemsRef.current);
      itemsRef.current = next;
      if (mountedRef.current) {
        setItems(next);
      }
    },
    [],
  );

  const processNext = useCallback(async () => {
    if (activeIdRef.current) {
      return;
    }

    while (pendingRef.current.length > 0) {
      const id = pendingRef.current.shift();
      if (!id) {
        continue;
      }
      const request = requestsRef.current.get(id);
      if (!request) {
        continue;
      }

      const controller = new AbortController();
      activeIdRef.current = id;
      controllerRef.current = controller;
      let completed = false;
      commit((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'processing',
                progress: { stage: 'validating', percentage: 0 },
                error: null,
              }
            : item,
        ),
      );

      try {
        const result = await videoProcessorService.process(
          request.file,
          request.options,
          controller.signal,
          (progress: ProcessingProgress) =>
            commit((current) =>
              current.map((item) =>
                item.id === id ? { ...item, progress } : item,
              ),
            ),
        );
        commit((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'completed',
                  progress: { stage: 'completed', percentage: 100 },
                  result,
                  error: null,
                }
              : item,
          ),
        );
        completed = true;
      } catch (caughtError) {
        const error = normalizeProcessingError(caughtError, 'validating');
        commit((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: error.code === 'cancelled' ? 'cancelled' : 'failed',
                  error: error.message,
                }
              : item,
          ),
        );
      } finally {
        if (activeIdRef.current === id) {
          activeIdRef.current = null;
          controllerRef.current = null;
          if (completed) {
            requestsRef.current.delete(id);
          }
        }
      }
    }
  }, [commit]);

  useEffect(() => {
    mountedRef.current = true;
    const requests = requestsRef.current;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      pendingRef.current = [];
      requests.clear();
    };
  }, []);

  const enqueue = useCallback(
    (file: File, options: VideoProcessingOptions = {}) => {
      const id = crypto.randomUUID();
      requestsRef.current.set(id, { file, options });
      pendingRef.current.push(id);
      commit((current) => [
        ...current,
        {
          id,
          file,
          status: 'queued',
          progress: { stage: 'queued', percentage: 0 },
          result: null,
          error: null,
        },
      ]);
      void processNext();
      return id;
    },
    [commit, processNext],
  );

  const cancel = useCallback(
    (id: string) => {
      if (activeIdRef.current === id) {
        controllerRef.current?.abort();
        return;
      }
      pendingRef.current = pendingRef.current.filter(
        (pendingId) => pendingId !== id,
      );
      commit((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: 'cancelled', error: null } : item,
        ),
      );
    },
    [commit],
  );

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      const request = requestsRef.current.get(id);
      if (
        !item ||
        !request ||
        (item.status !== 'failed' && item.status !== 'cancelled')
      ) {
        return false;
      }
      pendingRef.current.push(id);
      commit((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                status: 'queued',
                progress: { stage: 'queued', percentage: 0 },
                result: null,
                error: null,
              }
            : entry,
        ),
      );
      void processNext();
      return true;
    },
    [commit, processNext],
  );

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    pendingRef.current = [];
    requestsRef.current.clear();
    commit(() => []);
  }, [commit]);

  return { cancel, clear, enqueue, items, retry };
}
