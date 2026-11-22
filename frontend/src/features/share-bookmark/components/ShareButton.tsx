'use client';

import { LoaderCircle, Share2 } from 'lucide-react';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { useShare } from '../hooks/useShare';
import { ShareDialog } from './ShareDialog';
import { ShareSuccessToast } from './ShareSuccessToast';

export const ShareButton = memo(function ShareButton({
  videoId,
  title,
  text,
}: {
  videoId: string;
  title?: string;
  text?: string;
}) {
  const share = useShare(videoId, title, text);

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <motion.button
          aria-busy={share.isSharing}
          aria-haspopup="dialog"
          aria-label="Share video"
          className="group relative grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          disabled={share.isSharing}
          onClick={(event) => {
            event.stopPropagation();
            void share.share();
          }}
          onPointerUp={(event) => event.stopPropagation()}
          type="button"
          whileTap={share.isSharing ? undefined : { scale: 0.94 }}
        >
          {share.isSharing ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Share2 aria-hidden="true" className="h-5 w-5" />
          )}
        </motion.button>
        {share.error && (
          <span
            aria-live="assertive"
            className="max-w-24 text-center text-[0.625rem] font-medium text-rose-200"
            role="alert"
          >
            {share.error.message}
          </span>
        )}
      </div>
      <ShareDialog
        onOpenChange={(open) => {
          if (!open) {
            share.closeDialog();
          }
        }}
        errorMessage={share.error?.message}
        open={share.isDialogOpen}
        url={share.shareUrl ?? ''}
        onCopied={share.onCopied}
      />
      <ShareSuccessToast message={share.successMessage} />
    </>
  );
});
