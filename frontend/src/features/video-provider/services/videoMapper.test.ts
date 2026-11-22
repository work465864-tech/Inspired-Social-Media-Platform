import { describe, expect, it } from 'vitest';
import { videoMapper } from './videoMapper';
import type { PixabayVideoHit } from '../providers/pixabayTypes';

function makeHit(overrides: Partial<PixabayVideoHit> = {}): PixabayVideoHit {
  return {
    id: 10,
    tags: 'nature, forest',
    videos: {
      small: {
        url: 'https://cdn.pixabay.com/video/forest.mp4',
        width: 640,
        height: 360,
        thumbnail: 'https://cdn.pixabay.com/video/forest.jpg',
      },
    },
    ...overrides,
  };
}

describe('VideoMapper', () => {
  it('uses safe defaults for missing provider statistics and creator data', () => {
    const video = videoMapper.toVideo(makeHit());

    expect(video).toMatchObject({
      id: '10',
      title: 'nature · forest',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      creator: {
        id: null,
        name: 'Pixabay creator',
        avatarUrl: null,
      },
      createdAt: null,
      isDemoContent: true,
      attribution: { label: 'Pixabay' },
    });
  });

  it('rejects playback URLs outside the trusted Pixabay CDN', () => {
    const video = videoMapper.toVideo(
      makeHit({
        videos: {
          small: {
            url: 'https://untrusted.example/video.mp4',
            width: 640,
            height: 360,
          },
        },
      }),
    );

    expect(video).toBeNull();
  });
});
