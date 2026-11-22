import type { createSupabaseBrowserClient } from '../../../lib/supabase/client';

export type RealtimeClient = ReturnType<typeof createSupabaseBrowserClient>;
export type RealtimeChannel = ReturnType<RealtimeClient['channel']>;
export type RealtimeChannelOptions = Parameters<RealtimeClient['channel']>[1];

export class RealtimeChannelFactory {
  constructor(private readonly client: RealtimeClient) {}

  create(topic: string, options?: RealtimeChannelOptions): RealtimeChannel {
    const normalizedTopic = topic.trim();
    if (
      !normalizedTopic ||
      normalizedTopic.length > 200 ||
      normalizedTopic
        .split('')
        .some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        )
    ) {
      throw new Error('Realtime channel names must be non-empty and valid.');
    }
    return this.client.channel(normalizedTopic, options);
  }
}
