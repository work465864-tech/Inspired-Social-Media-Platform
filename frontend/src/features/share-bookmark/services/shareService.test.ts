import { describe, expect, it, vi } from 'vitest';
import { ShareService, ShareServiceError } from './shareService';

const shareData = {
  title: 'Connectly video',
  text: 'Watch this video',
  url: 'https://connectly.example/watch/video',
};

describe('ShareService', () => {
  it('reports unsupported native sharing for a fallback dialog', async () => {
    const service = new ShareService(() => undefined);
    await expect(service.share(shareData)).resolves.toBe('unsupported');
  });

  it('uses the native share API and recognizes user cancellation', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const service = new ShareService(() => nativeShare);

    await expect(service.share(shareData)).resolves.toBe('shared');
    expect(nativeShare).toHaveBeenCalledWith(shareData);

    const cancelled = new ShareService(
      () => () => Promise.reject(new DOMException('Dismissed', 'AbortError')),
    );
    await expect(cancelled.share(shareData)).resolves.toBe('cancelled');
  });

  it('surfaces browser permission failures', async () => {
    const service = new ShareService(
      () => () =>
        Promise.reject(new DOMException('Blocked', 'NotAllowedError')),
    );

    await expect(service.share(shareData)).rejects.toMatchObject<
      Partial<ShareServiceError>
    >({
      kind: 'permission',
      message: 'Sharing was blocked by your browser. Copy the link instead.',
    });
  });
});
