'use client';

import { AlertCircle, Check, LoaderCircle, RefreshCw } from 'lucide-react';
import Input from '../../../components/ui/Input';
import { profileUsernameSchema } from '../schemas/profileSchemas';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';

type UsernameFieldProps = {
  currentUserId?: string;
  onChange: (value: string) => void;
  value: string;
};

export function UsernameField({
  currentUserId,
  onChange,
  value,
}: UsernameFieldProps) {
  const parsedUsername = profileUsernameSchema.safeParse(value);
  const availability = useUsernameAvailability(value, currentUserId);
  const validationMessage = parsedUsername.success
    ? null
    : parsedUsername.error.issues[0]?.message;
  const errorMessage =
    validationMessage ??
    (availability.status === 'taken'
      ? 'That username is already in use.'
      : availability.status === 'error'
        ? availability.error
        : null);

  return (
    <div className="grid gap-2">
      <label
        className="text-sm font-medium text-foreground"
        htmlFor="profile-username"
      >
        Username
      </label>
      <div className="relative">
        <Input
          autoComplete="username"
          id="profile-username"
          maxLength={24}
          aria-describedby="profile-username-status"
          aria-invalid={Boolean(errorMessage)}
          hasError={Boolean(errorMessage)}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          placeholder="yourname"
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted">
          {availability.status === 'checking' ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : availability.status === 'available' ? (
            <Check aria-hidden="true" className="h-4 w-4 text-accent" />
          ) : errorMessage ? (
            <AlertCircle aria-hidden="true" className="h-4 w-4 text-red-500" />
          ) : null}
        </span>
      </div>
      <p
        aria-live="polite"
        className={`min-h-5 text-xs ${
          errorMessage
            ? 'text-red-600 dark:text-red-300'
            : availability.status === 'available'
              ? 'text-accent'
              : 'text-muted'
        }`}
        id="profile-username-status"
        role={errorMessage ? 'status' : undefined}
      >
        {errorMessage ??
          (availability.status === 'checking'
            ? 'Checking availability…'
            : availability.status === 'available'
              ? 'Username is available.'
              : '3–24 lowercase letters, numbers, or underscores.')}
      </p>
      {availability.status === 'error' && (
        <button
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
          onClick={availability.retry}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Check again
        </button>
      )}
      {availability.status === 'taken' &&
        availability.suggestions.length > 0 && (
          <div
            aria-label="Available username suggestions"
            className="flex flex-wrap gap-2"
          >
            {availability.suggestions.map((suggestion) => (
              <button
                className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary"
                key={suggestion}
                onClick={() => onChange(suggestion)}
                type="button"
              >
                @{suggestion}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
