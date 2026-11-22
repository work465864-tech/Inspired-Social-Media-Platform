'use client';

import { useCallback, useRef, useState } from 'react';
import type { UploadQueueItem } from '../types/upload';

export function useUploadQueue() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const itemsRef = useRef<UploadQueueItem[]>([]);

  const add = useCallback((file: File) => {
    const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
    const duplicate = itemsRef.current.some(
      (item) =>
        `${item.file.name}:${item.file.size}:${item.file.lastModified}` ===
          fingerprint && item.status !== 'cancelled',
    );
    if (duplicate) {
      return null;
    }

    const id = crypto.randomUUID();
    const next = [
      { id, file, status: 'queued' as const, percentage: 0, error: null },
    ];
    itemsRef.current = next;
    setItems(next);
    return id;
  }, []);

  const update = useCallback(
    (id: string, changes: Partial<Omit<UploadQueueItem, 'id' | 'file'>>) => {
      const next = itemsRef.current.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      );
      itemsRef.current = next;
      setItems(next);
    },
    [],
  );

  const clear = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  return { add, clear, items, update };
}
