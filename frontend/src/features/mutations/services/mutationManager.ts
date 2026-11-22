export class MutationManager {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  execute<TData>(
    deduplicationKey: string | undefined,
    operation: () => Promise<TData>,
  ): Promise<TData> {
    if (!deduplicationKey) {
      return operation();
    }

    const existing = this.inFlight.get(deduplicationKey);
    if (existing) {
      return existing.then((value) => value as TData);
    }

    const request = operation();
    this.inFlight.set(deduplicationKey, request);
    void request
      .finally(() => {
        if (this.inFlight.get(deduplicationKey) === request) {
          this.inFlight.delete(deduplicationKey);
        }
      })
      .catch(() => undefined);
    return request;
  }

  get activeCount(): number {
    return this.inFlight.size;
  }
}
