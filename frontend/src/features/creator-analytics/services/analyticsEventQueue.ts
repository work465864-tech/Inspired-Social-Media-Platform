'use client';

import type { CreatorAnalyticsEventInput } from '../types';

const batchSize = 50;
const maximumQueueSize = 250;
const flushIntervalMs = 8000;

let queue: CreatorAnalyticsEventInput[] = [];
let flushInProgress = false;
let lifecycleListenersInitialized = false;
let retryTimer: number | null = null;
let intervalTimer: number | null = null;

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

function getSessionId(): string {
  const storageKey = 'connectly-analytics-session';
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const sessionId = createUuid();
  window.sessionStorage.setItem(storageKey, sessionId);
  return sessionId;
}

function initializeLifecycleListeners(): void {
  if (lifecycleListenersInitialized) {
    return;
  }
  lifecycleListenersInitialized = true;

  const flushOnHide = () => {
    void flush(true);
  };
  window.addEventListener('pagehide', flushOnHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnHide();
    }
  });
  window.addEventListener('online', flushOnHide);
  intervalTimer = window.setInterval(() => {
    void flush();
  }, flushIntervalMs);
}

async function flush(keepalive = false): Promise<void> {
  if (flushInProgress || queue.length === 0 || !navigator.onLine) {
    return;
  }

  flushInProgress = true;
  const batch = queue.splice(0, batchSize);
  try {
    const response = await fetch('/api/creator-analytics/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive,
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
          ? payload.error
          : 'Analytics events were rejected.';
      if ([400, 401, 403, 413].includes(response.status)) {
        console.error(
          'Creator analytics batch was discarded:',
          response.status,
          message,
        );
        return;
      }
      throw new Error(message);
    }
  } catch (error) {
    queue = [...batch, ...queue].slice(-maximumQueueSize);
    console.error(
      'Creator analytics batch could not be delivered:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    if (retryTimer === null) {
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void flush();
      }, 5000);
    }
  } finally {
    flushInProgress = false;
    if (queue.length >= batchSize) {
      void flush();
    }
  }
}

export function trackCreatorAnalyticsEvent(
  event: Omit<
    CreatorAnalyticsEventInput,
    'eventId' | 'sessionId' | 'occurredAt'
  >,
): void {
  initializeLifecycleListeners();
  if (queue.length >= maximumQueueSize) {
    queue.shift();
    console.warn('Creator analytics queue reached its bounded capacity.');
  }

  queue.push({
    ...event,
    eventId: createUuid(),
    sessionId: getSessionId(),
    occurredAt: new Date().toISOString(),
  });
  if (queue.length >= batchSize) {
    void flush();
  }
}

export function flushCreatorAnalyticsEvents(): Promise<void> {
  return flush(true);
}

export function resetCreatorAnalyticsQueueForTests(): void {
  queue = [];
  flushInProgress = false;
  lifecycleListenersInitialized = false;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (intervalTimer !== null) {
    window.clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
