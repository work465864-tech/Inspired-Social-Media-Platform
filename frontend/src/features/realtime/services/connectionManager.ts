import { ConnectionService } from './connectionService';

type RetryAction = () => Promise<void>;
type PendingRetry = {
  action: RetryAction;
  onExhausted: () => void;
};

export class ConnectionManager {
  private readonly attempts = new Map<string, number>();
  private readonly timers = new Map<string, number>();
  private readonly pending = new Map<string, PendingRetry>();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly connection: ConnectionService,
    private readonly maxRetries = 6,
    private readonly baseDelayMs = 1_000,
    private readonly maxDelayMs = 30_000,
  ) {
    let wasOnline = connection.getSnapshot().isOnline;
    this.unsubscribe = connection.subscribe((snapshot) => {
      if (!wasOnline && snapshot.isOnline) {
        void this.retryPending();
      }
      wasOnline = snapshot.isOnline;
    });
  }

  schedule(key: string, action: RetryAction, onExhausted: () => void): void {
    if (this.timers.has(key)) {
      return;
    }
    const attempt = (this.attempts.get(key) ?? 0) + 1;
    if (attempt > this.maxRetries) {
      this.pending.delete(key);
      onExhausted();
      return;
    }
    this.attempts.set(key, attempt);
    this.pending.set(key, { action, onExhausted });
    if (!this.connection.getSnapshot().isOnline) {
      return;
    }

    const delay = Math.min(
      this.baseDelayMs * 2 ** (attempt - 1),
      this.maxDelayMs,
    );
    const timer = window.setTimeout(() => {
      this.timers.delete(key);
      if (!this.connection.getSnapshot().isOnline) {
        return;
      }
      void action().catch((error: unknown) =>
        this.connection.reportError(error, 'subscription'),
      );
    }, delay);
    this.timers.set(key, timer);
  }

  async retryPending(): Promise<void> {
    if (!this.connection.getSnapshot().isOnline) {
      return;
    }
    const pending = [...this.pending.entries()];
    for (const [key, retry] of pending) {
      if (this.timers.has(key)) {
        window.clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      this.pending.delete(key);
      try {
        await retry.action();
      } catch (error) {
        this.connection.reportError(error, 'subscription');
        this.schedule(key, retry.action, retry.onExhausted);
      }
    }
  }

  retryNow(key: string, action: RetryAction): void {
    this.cancel(key);
    this.attempts.delete(key);
    if (!this.connection.getSnapshot().isOnline) {
      this.pending.set(key, {
        action,
        onExhausted: () =>
          this.connection.reportError(
            new Error('Realtime retries were exhausted.'),
            'subscription',
          ),
      });
      return;
    }
    void action().catch((error: unknown) =>
      this.connection.reportError(error, 'subscription'),
    );
  }

  reset(key: string): void {
    this.cancel(key);
    this.attempts.delete(key);
    this.pending.delete(key);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(timer);
    }
    this.timers.delete(key);
    this.pending.delete(key);
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      if (typeof window !== 'undefined') {
        window.clearTimeout(timer);
      }
    }
    this.timers.clear();
    this.attempts.clear();
    this.pending.clear();
    this.unsubscribe();
  }
}
