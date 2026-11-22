type RegistryEntry = {
  signature: string;
  references: number;
  cleanup: () => void;
};

export class SubscriptionRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  constructor(private readonly onError: (error: unknown) => void) {}

  get size(): number {
    return this.entries.size;
  }

  acquire(key: string, signature: string, start: () => () => void): () => void {
    if (!key.trim()) {
      throw new Error('Realtime subscription keys cannot be empty.');
    }

    let entry = this.entries.get(key);
    if (entry && entry.signature !== signature) {
      throw new Error(
        `Realtime subscription "${key}" is already registered with different options.`,
      );
    }
    if (!entry) {
      entry = { signature, references: 0, cleanup: start() };
      this.entries.set(key, entry);
    }
    entry.references += 1;

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      const current = this.entries.get(key);
      if (!current) {
        return;
      }
      current.references -= 1;
      if (current.references === 0) {
        this.entries.delete(key);
        this.runCleanup(current.cleanup);
      }
    };
  }

  dispose(): void {
    const entries = [...this.entries.values()];
    this.entries.clear();
    for (const entry of entries) {
      this.runCleanup(entry.cleanup);
    }
  }

  private runCleanup(cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      this.onError(error);
    }
  }
}
