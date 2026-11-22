import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipboardService, ClipboardServiceError } from './clipboardService';

describe('ClipboardService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies a URL through the browser Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(
      new ClipboardService().copy('https://connectly.example/watch/video'),
    ).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith(
      'https://connectly.example/watch/video',
    );
  });

  it('surfaces permission failures without claiming the link was copied', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(
      new ClipboardService().copy('https://connectly.example/watch/video'),
    ).rejects.toMatchObject<Partial<ClipboardServiceError>>({
      kind: 'permission',
      message:
        'Clipboard permission was denied. Allow access or copy the link manually.',
    });
  });

  it('rejects empty values', async () => {
    await expect(new ClipboardService().copy('  ')).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });
});
