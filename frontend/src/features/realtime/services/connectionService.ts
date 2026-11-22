import type {
  ChannelConnectionState,
  RealtimeConnectionError,
  RealtimeConnectionSnapshot,
  RealtimeErrorKind,
} from '../types/connection';

type ConnectionListener = (snapshot: RealtimeConnectionSnapshot) => void;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'An unexpected realtime error occurred.';
}

function classifyError(error: unknown): RealtimeErrorKind {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('permission') ||
    message.includes('token')
  ) {
    return 'authentication';
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('websocket')
  ) {
    return 'network';
  }
  if (message.includes('channel') || message.includes('subscribe')) {
    return 'subscription';
  }
  return 'unexpected';
}

export class ConnectionService {
  private readonly listeners = new Set<ConnectionListener>();
  private readonly channels = new Map<string, ChannelConnectionState>();
  private started = false;
  private online = typeof navigator === 'undefined' ? true : navigator.onLine;
  private lastError: RealtimeConnectionError | null = null;
  private snapshot = this.createSnapshot();

  private readonly handleOnline = () => {
    this.online = true;
    this.publish();
  };

  private readonly handleOffline = () => {
    this.online = false;
    this.publish();
  };

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }
    this.started = true;
    this.online = navigator.onLine;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.publish();
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = (): RealtimeConnectionSnapshot => this.snapshot;

  updateChannel(
    key: string,
    status: ChannelConnectionState,
    error?: unknown,
  ): void {
    this.channels.set(key, status);
    if (error) {
      this.lastError = {
        kind: classifyError(error),
        message: getErrorMessage(error),
        occurredAt: Date.now(),
      };
    } else if (status === 'connected') {
      this.lastError = null;
    }
    this.publish();
  }

  removeChannel(key: string): void {
    this.channels.delete(key);
    if (this.channels.size === 0) {
      this.lastError = null;
    }
    this.publish();
  }

  reportError(error: unknown, kind?: RealtimeErrorKind): void {
    this.lastError = {
      kind: kind ?? classifyError(error),
      message: getErrorMessage(error),
      occurredAt: Date.now(),
    };
    this.publish();
  }

  dispose(): void {
    if (this.started && typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.started = false;
    this.channels.clear();
    this.listeners.clear();
    this.lastError = null;
  }

  private createSnapshot(): RealtimeConnectionSnapshot {
    const channelStates = [...this.channels.values()];
    let status: RealtimeConnectionSnapshot['status'];
    if (!this.online) {
      status = 'offline';
    } else if (channelStates.includes('connected')) {
      status = 'connected';
    } else if (channelStates.includes('connecting')) {
      status = 'connecting';
    } else if (channelStates.includes('reconnecting')) {
      status = 'reconnecting';
    } else if (channelStates.includes('error') || this.lastError) {
      status = 'error';
    } else {
      status = 'disconnected';
    }

    return {
      status,
      isOnline: this.online,
      activeChannels: this.channels.size,
      channels: Object.fromEntries(this.channels),
      lastError: this.lastError,
    };
  }

  private publish(): void {
    this.snapshot = this.createSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch (error) {
        this.lastError = {
          kind: 'unexpected',
          message: getErrorMessage(error),
          occurredAt: Date.now(),
        };
        this.snapshot = this.createSnapshot();
      }
    }
  }
}
