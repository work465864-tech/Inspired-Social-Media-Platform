'use client';

import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';

type AvatarPickerProps = {
  file: File | null;
  imageUrl: string | null;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
};

export function AvatarPicker({
  file,
  imageUrl,
  onClear,
  onFileChange,
}: AvatarPickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const visibleImage = previewUrl ?? imageUrl;

  return (
    <div className="flex flex-col items-center gap-5 rounded-card border border-border bg-surface/70 p-5 text-center sm:flex-row sm:text-left">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised">
        {visibleImage ? (
          <img
            alt="Avatar preview"
            className="h-full w-full object-cover"
            src={visibleImage}
          />
        ) : (
          <ImagePlus aria-hidden="true" className="h-8 w-8 text-muted" />
        )}
      </div>
      <div className="grid flex-1 justify-items-center gap-2 sm:justify-items-start">
        <p className="text-sm font-semibold text-foreground">Profile photo</p>
        <p className="text-xs leading-5 text-muted">
          Optional. Images are center-cropped to a square and compressed before
          upload.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-control bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:shadow-glow focus-within:outline-none focus-within:ring-2 focus-within:ring-primary">
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            Choose image
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                onFileChange(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
              type="file"
            />
          </label>
          {visibleImage && (
            <Button
              className="min-h-10 px-3.5 py-2"
              onClick={() => {
                onFileChange(null);
                onClear();
              }}
              type="button"
              variant="secondary"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">JPG, PNG, or WebP · up to 5 MB</p>
      </div>
    </div>
  );
}
