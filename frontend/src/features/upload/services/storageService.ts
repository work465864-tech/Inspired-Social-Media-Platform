import { Upload as TusUpload } from 'tus-js-client';
import { uploadBuckets, uploadLimits } from '../constants/uploadConfig';
import type { SignedUpload } from '../types/upload';
import { normalizeUploadError, VideoUploadError } from './uploadErrorService';

type UploadProgressCallback = (
  bytesUploaded: number,
  bytesTotal: number,
) => void;

function getResumableEndpoint(supabaseUrl: string): string {
  const projectUrl = new URL(supabaseUrl);
  if (projectUrl.hostname.endsWith('.supabase.co')) {
    projectUrl.hostname = projectUrl.hostname.replace(
      /\.supabase\.co$/,
      '.storage.supabase.co',
    );
  }
  return new URL('/storage/v1/upload/resumable', projectUrl).toString();
}

function waitBeforeRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new VideoUploadError('cancelled', 'The upload was cancelled.'));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new VideoUploadError('cancelled', 'The upload was cancelled.'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

function uploadWithProgress(
  signedUpload: SignedUpload,
  file: File,
  signal: AbortSignal,
  onProgress: UploadProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new VideoUploadError('cancelled', 'The upload was cancelled.'));
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey) {
      reject(
        new VideoUploadError(
          'storage_error',
          'Supabase Storage is not configured in this browser.',
        ),
      );
      return;
    }

    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file, file.name);

    const cleanup = () => {
      signal.removeEventListener('abort', abort);
    };
    const abort = () => request.abort();
    request.open('PUT', signedUpload.signedUrl);
    request.setRequestHeader('apikey', apiKey);
    request.setRequestHeader('x-upsert', 'true');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        onProgress(file.size, file.size);
        resolve();
      } else {
        reject(
          new VideoUploadError(
            request.status === 401 || request.status === 403
              ? 'permission'
              : request.status >= 500
                ? 'server'
                : 'storage_error',
            'Supabase Storage rejected the file upload.',
          ),
        );
      }
    };
    request.onerror = () => {
      cleanup();
      reject(
        new VideoUploadError(
          'offline',
          'The Storage upload lost its network connection.',
        ),
      );
    };
    request.onabort = () => {
      cleanup();
      reject(new VideoUploadError('cancelled', 'The upload was cancelled.'));
    };
    signal.addEventListener('abort', abort, { once: true });
    request.send(formData);
  });
}

export const storageService = {
  async uploadOriginal(
    file: File,
    objectPath: string,
    signal: AbortSignal,
    onProgress: UploadProgressCallback,
  ): Promise<void> {
    if (file.size > uploadLimits.maxStoredVideoBytes) {
      throw new VideoUploadError(
        'file_too_large',
        'The original video exceeds the Storage limit.',
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !apiKey) {
      throw new VideoUploadError(
        'storage_error',
        'Supabase Storage is not configured in this browser.',
      );
    }
    if (signal.aborted) {
      throw new VideoUploadError('cancelled', 'The upload was cancelled.');
    }

    const supabase = (
      await import('../../../lib/supabase/client')
    ).createSupabaseBrowserClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      throw new VideoUploadError(
        'permission',
        'Sign in again before uploading this video.',
      );
    }

    const endpoint = getResumableEndpoint(supabaseUrl);
    const upload = new TusUpload(file, {
      endpoint,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3_000, 5_000, 10_000],
      headers: {
        apikey: apiKey,
        authorization: `Bearer ${session.access_token}`,
      },
      metadata: {
        bucketName: uploadBuckets.original,
        objectName: objectPath,
        contentType: file.type,
        cacheControl: '3600',
      },
      fingerprint: async (sourceFile, options) =>
        [
          endpoint,
          options.metadata?.objectName ?? objectPath,
          sourceFile.size,
          sourceFile.lastModified,
        ].join(':'),
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => onProgress(sent, total),
    });

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => signal.removeEventListener('abort', abort);
      const abort = () => {
        void upload.abort(true).then(
          () =>
            reject(
              new VideoUploadError('cancelled', 'The upload was cancelled.'),
            ),
          (abortError: unknown) => reject(normalizeUploadError(abortError)),
        );
      };

      upload.options.onError = (uploadError) => {
        cleanup();
        reject(normalizeUploadError(uploadError));
      };
      upload.options.onSuccess = () => {
        cleanup();
        resolve();
      };
      signal.addEventListener('abort', abort, { once: true });

      void upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (signal.aborted) {
            abort();
            return;
          }
          const previousUpload = previousUploads[0];
          if (previousUpload) {
            upload.resumeFromPreviousUpload(previousUpload);
          }
          upload.start();
        })
        .catch((uploadError: unknown) => {
          cleanup();
          reject(normalizeUploadError(uploadError));
        });
    });
  },

  async uploadDerivative(
    signedUpload: SignedUpload,
    file: File,
    signal: AbortSignal,
    onProgress: UploadProgressCallback,
  ): Promise<void> {
    const maximumSize = file.type.startsWith('image/')
      ? uploadLimits.maxThumbnailBytes
      : uploadLimits.maxStoredVideoBytes;
    if (file.size <= 0 || file.size > maximumSize) {
      throw new VideoUploadError(
        'file_too_large',
        'The prepared upload file exceeds the Storage limit.',
      );
    }

    const retryDelays = [0, 1_000, 3_000];
    let lastError: VideoUploadError | null = null;
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (signal.aborted) {
        throw new VideoUploadError('cancelled', 'The upload was cancelled.');
      }
      if (retryDelays[attempt] > 0) {
        await waitBeforeRetry(retryDelays[attempt], signal);
      }
      try {
        await uploadWithProgress(signedUpload, file, signal, onProgress);
        return;
      } catch (error) {
        lastError = normalizeUploadError(error);
        if (!lastError.retryable || attempt === retryDelays.length - 1) {
          throw lastError;
        }
      }
    }

    throw (
      lastError ??
      new VideoUploadError('upload_failed', 'The file could not be uploaded.')
    );
  },
};
