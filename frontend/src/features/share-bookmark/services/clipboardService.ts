export type ClipboardErrorKind = 'permission' | 'unavailable' | 'unexpected';

export class ClipboardServiceError extends Error {
  constructor(
    readonly kind: ClipboardErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ClipboardServiceError';
  }
}

function createFallbackCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) {
    return false;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.setAttribute('aria-hidden', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();

  try {
    return document.execCommand('copy');
  } finally {
    input.remove();
  }
}

export class ClipboardService {
  async copy(text: string): Promise<void> {
    if (text.trim().length === 0) {
      throw new ClipboardServiceError(
        'unavailable',
        'There is no link to copy.',
      );
    }

    if (typeof navigator === 'undefined') {
      throw new ClipboardServiceError(
        'unavailable',
        'Clipboard access is unavailable in this environment.',
      );
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          error.name === 'NotAllowedError'
        ) {
          throw new ClipboardServiceError(
            'permission',
            'Clipboard permission was denied. Allow access or copy the link manually.',
          );
        }
        throw new ClipboardServiceError(
          'unexpected',
          error instanceof Error
            ? error.message
            : 'The link could not be copied.',
        );
      }
    }

    try {
      if (!createFallbackCopy(text)) {
        throw new ClipboardServiceError(
          'unavailable',
          'Clipboard access is not supported. Select and copy the link manually.',
        );
      }
    } catch (error) {
      if (error instanceof ClipboardServiceError) {
        throw error;
      }
      throw new ClipboardServiceError(
        'unexpected',
        error instanceof Error
          ? error.message
          : 'The link could not be copied.',
      );
    }
  }
}

export const clipboardService = new ClipboardService();
