'use client';

import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/inputs/Textarea';
import { EmojiPickerTrigger } from './EmojiPickerTrigger';

const maxLength = 2000;

export function CommentInput({
  disabled = false,
  disabledMessage,
  error,
  onSubmit,
  submitting = false,
  textareaRef,
}: {
  disabled?: boolean;
  disabledMessage?: string;
  error?: string | null;
  onSubmit: (content: string) => Promise<boolean>;
  submitting?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [value, setValue] = useState('');
  const generatedId = useId();
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = textareaRef ?? localTextareaRef;
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const length = [...value].length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || disabled || length === 0 || length > maxLength) {
      return;
    }

    if (await onSubmit(value)) {
      setValue('');
    }
  }

  function insertEmoji(emoji: string) {
    const textarea = inputRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;

    if ([...nextValue].length <= maxLength) {
      setValue(nextValue);
      requestAnimationFrame(() => {
        textarea?.focus();
        const nextPosition = start + emoji.length;
        textarea?.setSelectionRange(nextPosition, nextPosition);
      });
    }
  }

  return (
    <form className="space-y-2" onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor={`${generatedId}-input`}>
        Add a comment
      </label>
      <Textarea
        aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
        className="min-h-[76px] resize-none"
        disabled={disabled || submitting}
        id={`${generatedId}-input`}
        maxLength={4000}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Add a thoughtful comment…"
        ref={inputRef}
        rows={2}
        value={value}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <EmojiPickerTrigger
            disabled={disabled || submitting}
            onSelect={insertEmoji}
          />
          <p className="text-xs text-muted" id={hintId}>
            {disabled ? disabledMessage : 'Ctrl/⌘ + Enter to send'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-live="polite"
            className={`text-xs tabular-nums ${length > maxLength ? 'text-danger' : 'text-muted'}`}
          >
            {length}/{maxLength}
          </span>
          <Button
            aria-label="Post comment"
            disabled={
              disabled || submitting || length === 0 || length > maxLength
            }
            size="icon"
            type="submit"
          >
            {submitting ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-danger" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
