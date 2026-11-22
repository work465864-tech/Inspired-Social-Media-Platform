'use client';

import { useState } from 'react';

const emojis = ['❤️', '😂', '👏', '🔥', '😍', '🥹', '✨', '🙌'];

export function EmojiPickerTrigger({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Choose an emoji"
        className="grid h-10 w-10 place-items-center rounded-full text-lg transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        😊
      </button>
      {open && (
        <div
          aria-label="Choose an emoji"
          className="absolute bottom-full left-0 z-10 mb-2 grid grid-cols-4 gap-1 rounded-card border border-border bg-surface-raised p-2 shadow-lg"
          role="group"
        >
          {emojis.map((emoji) => (
            <button
              aria-label={emoji}
              className="grid h-10 w-10 place-items-center rounded-control text-xl hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
