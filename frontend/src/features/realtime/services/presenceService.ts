import type { PresenceManager } from './presenceManager';

export type PresenceSnapshot<T extends Record<string, unknown>> = Record<
  string,
  Array<T & { presence_ref: string }>
>;

export class PresenceService {
  constructor(private readonly presenceManager: PresenceManager) {}

  join<T extends Record<string, unknown>>(
    topic: string,
    key: string,
    payload: T,
    onSync: (state: PresenceSnapshot<T>) => void,
  ): () => void {
    return this.presenceManager.join(topic, key, payload, onSync);
  }
}
