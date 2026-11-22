'use client';

import { Check, Copy, LoaderCircle } from 'lucide-react';
import { memo } from 'react';
import { useCopyLink } from '../hooks/useCopyLink';
import { ShareSuccessToast } from './ShareSuccessToast';

export const CopyLinkButton = memo(function CopyLinkButton({
  url,
  onCopied,
}: {
  url: string;
  onCopied: () => void;
}) {
  const { copy, copied, error, isCopying } = useCopyLink();

  return (
    <div className="space-y-2">
      <button
        aria-busy={isCopying}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
        disabled={isCopying}
        onClick={() => {
          void copy(url).then((copied) => {
            if (copied) {
              onCopied();
            }
          });
        }}
        type="button"
      >
        {isCopying ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
        ) : copied ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Copy aria-hidden="true" className="h-4 w-4" />
        )}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <ShareSuccessToast
        message={copied ? 'Link copied to clipboard.' : null}
      />
      {error && (
        <p aria-live="assertive" className="text-sm text-danger" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
});
