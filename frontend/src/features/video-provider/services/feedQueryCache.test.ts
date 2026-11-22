import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { videoQueryKeys } from '../constants';
import type { Video, VideoPage } from '../types';
import { updateCachedFeedVideo } from './feedQueryCache';

function makeVideo(id: string): Video {
  return {
    id,
    title: `Video ${id}`,
    description: '',
    thumbnail: null,
    playbackUrl: `https://cdn.example/${id}.mp4`,
    duration: 10,
    width: 720,
    height: 1280,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    creator: { id: null, name: 'Creator', avatarUrl: null },
    createdAt: null,
    isDemoContent: false,
    attribution: {
      label: 'Connectly',
      url: `https://cdn.example/${id}.mp4`,
    },
  };
}

describe('updateCachedFeedVideo', () => {
  it('updates only the matching video across cached feed pages', () => {
    const client = new QueryClient();
    const first = makeVideo('first');
    const second = makeVideo('second');
    const page: VideoPage = {
      items: [first, second],
      nextPage: null,
      totalHits: 2,
    };
    client.setQueryData(videoQueryKeys.feed('user-1'), {
      pages: [page],
      pageParams: [1],
    });

    updateCachedFeedVideo(client, 'user-1', 'second', (video) => ({
      ...video,
      likes: video.likes + 1,
    }));

    const cached = client.getQueryData<{
      pages: VideoPage[];
      pageParams: number[];
    }>(videoQueryKeys.feed('user-1'));
    expect(cached?.pages[0]?.items.map((video) => video.likes)).toEqual([0, 1]);
  });
});
