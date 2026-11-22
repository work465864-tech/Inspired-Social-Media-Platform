import type { Video as DatabaseVideo } from '../../feed/types/models';

export type DatabaseFeedSources = {
  uploads: readonly DatabaseVideo[];
  trending: readonly DatabaseVideo[];
  following: readonly DatabaseVideo[];
  recommended: readonly DatabaseVideo[];
};

export class FeedPriorityEngine {
  order(sources: DatabaseFeedSources): DatabaseVideo[] {
    const seen = new Set<string>();
    const ordered: DatabaseVideo[] = [];

    for (const source of [
      sources.uploads,
      sources.trending,
      sources.following,
      sources.recommended,
    ]) {
      for (const video of source) {
        if (seen.has(video.id)) {
          continue;
        }
        seen.add(video.id);
        ordered.push(video);
      }
    }

    return ordered;
  }
}

export const feedPriorityEngine = new FeedPriorityEngine();
