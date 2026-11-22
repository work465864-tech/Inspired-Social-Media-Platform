import type { MutationQueueSnapshot } from '../types';

type QueueJob = {
  execute: () => Promise<unknown>;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
};

export class MutationQueue {
  private readonly jobs: QueueJob[] = [];
  private readonly listeners = new Set<() => void>();
  private online = typeof navigator === 'undefined' || navigator.onLine;
  private processing = false;
  private started = false;
  private disposed = false;
  private snapshot: MutationQueueSnapshot = this.createSnapshot();

  private readonly onOnline = () => {
    this.setOnlineStatus(true);
  };

  private readonly onOffline = () => {
    this.setOnlineStatus(false);
  };

  setOnlineStatus(isOnline: boolean): void {
    this.online = isOnline;
    this.publish();
    if (isOnline) {
      void this.process();
    }
  }

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }
    this.started = true;
    this.disposed = false;
    this.online = navigator.onLine;
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    this.publish();
    void this.process();
  }

  enqueue<T>(execute: () => Promise<T>): Promise<T> {
    if (this.disposed) {
      return Promise.reject(
        new Error('The mutation queue is no longer available.'),
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.jobs.push({
        execute,
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.publish();
      void this.process();
    });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): MutationQueueSnapshot => this.snapshot;

  dispose(): void {
    if (this.started && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
    this.started = false;
    this.disposed = true;
    for (const job of this.jobs.splice(0)) {
      job.reject(new Error('The mutation queue was disposed.'));
    }
    this.publish();
    this.listeners.clear();
  }

  private async process(): Promise<void> {
    if (!this.online || this.processing || this.disposed) {
      return;
    }
    this.processing = true;
    this.publish();
    try {
      while (this.online && this.jobs.length > 0 && !this.disposed) {
        const job = this.jobs.shift();
        if (!job) {
          continue;
        }
        this.publish();
        try {
          job.resolve(await job.execute());
        } catch (error) {
          job.reject(error);
        }
      }
    } finally {
      this.processing = false;
      this.publish();
      if (this.online && this.jobs.length > 0 && !this.disposed) {
        void this.process();
      }
    }
  }

  private createSnapshot(): MutationQueueSnapshot {
    return {
      pendingCount: this.jobs.length,
      isOnline: this.online,
      isProcessing: this.processing,
    };
  }

  private publish(): void {
    this.snapshot = this.createSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }
}
