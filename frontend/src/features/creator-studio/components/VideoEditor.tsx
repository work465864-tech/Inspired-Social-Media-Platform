'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/overlay/Modal';
import type { CreatorVideo, CreatorVideoEditorInput } from '../types';

export function VideoEditor({
  video,
  isSaving,
  onClose,
  onSave,
}: {
  video: CreatorVideo | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (videoId: string, input: CreatorVideoEditorInput) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] =
    useState<CreatorVideoEditorInput['visibility']>('public');
  const [hashtags, setHashtags] = useState('');

  useEffect(() => {
    setTitle(video?.title ?? '');
    setCaption(video?.caption ?? '');
    setVisibility(video?.visibility ?? 'public');
    setHashtags(video?.hashtags.join(', ') ?? '');
  }, [video]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!video) {
      return;
    }

    await onSave(video.id, {
      title,
      caption,
      visibility,
      hashtags: hashtags
        .split(',')
        .map((tag) => tag.trim().replace(/^#+/, ''))
        .filter(Boolean),
    });
  }

  return (
    <Modal
      description="Update the details shown with this video."
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={video !== null}
      title="Edit video"
    >
      {video && (
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Title
            <input
              className="min-h-11 rounded-xl border border-border bg-canvas px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              maxLength={160}
              onChange={(event) => setTitle(event.currentTarget.value)}
              required
              value={title}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Caption
            <textarea
              className="min-h-24 resize-y rounded-xl border border-border bg-canvas px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              maxLength={2200}
              onChange={(event) => setCaption(event.currentTarget.value)}
              value={caption}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Hashtags
            <input
              className="min-h-11 rounded-xl border border-border bg-canvas px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onChange={(event) => setHashtags(event.currentTarget.value)}
              placeholder="design, travel, creator"
              value={hashtags}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Visibility
            <select
              className="min-h-11 rounded-xl border border-border bg-canvas px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onChange={(event) =>
                setVisibility(
                  event.currentTarget
                    .value as CreatorVideoEditorInput['visibility'],
                )
              }
              value={visibility}
            >
              <option value="public">Everyone</option>
              <option value="followers">Followers</option>
              <option value="private">Only me</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
