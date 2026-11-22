export type NativeShareData = {
  title: string;
  text: string;
  url: string;
};

export type ShareResult = 'shared' | 'unsupported' | 'cancelled';

export type ShareErrorKind = 'permission' | 'unexpected';

export class ShareServiceError extends Error {
  constructor(
    readonly kind: ShareErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ShareServiceError';
  }
}

type NativeShare = (data: NativeShareData) => Promise<void>;

function getNativeShare(): NativeShare | undefined {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return undefined;
  }
  return (data) => navigator.share(data);
}

export class ShareService {
  constructor(
    private readonly getShare: () => NativeShare | undefined = getNativeShare,
  ) {}

  async share(data: NativeShareData): Promise<ShareResult> {
    const share = this.getShare();
    if (!share) {
      return 'unsupported';
    }

    try {
      await share(data);
      return 'shared';
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        return 'cancelled';
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'NotAllowedError'
      ) {
        throw new ShareServiceError(
          'permission',
          'Sharing was blocked by your browser. Copy the link instead.',
        );
      }
      const message =
        error instanceof Error
          ? error.message
          : 'The video could not be shared.';
      throw new ShareServiceError('unexpected', message);
    }
  }
}

export const shareService = new ShareService();
