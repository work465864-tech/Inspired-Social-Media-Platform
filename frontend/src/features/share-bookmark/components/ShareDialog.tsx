'use client';

import { Link2 } from 'lucide-react';
import { memo } from 'react';
import { Modal } from '../../../components/ui/overlay/Modal';
import { CopyLinkButton } from './CopyLinkButton';

export const ShareDialog = memo(function ShareDialog({
  onOpenChange,
  open,
  errorMessage,
  url,
  onCopied,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  errorMessage?: string;
  url: string;
  onCopied: () => void;
}) {
  return (
    <Modal
      description="Send this video to someone or copy its Connectly link."
      onOpenChange={onOpenChange}
      open={open}
      title="Share this video"
    >
      <div className="space-y-4">
        {errorMessage && (
          <p aria-live="assertive" className="text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Video link
          </span>
          <span className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-canvas px-3 text-sm text-foreground">
            <Link2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
            <input
              aria-label="Video share link"
              className="min-w-0 flex-1 bg-transparent outline-none"
              readOnly
              value={url}
            />
          </span>
        </label>
        <CopyLinkButton onCopied={onCopied} url={url} />
      </div>
    </Modal>
  );
});
