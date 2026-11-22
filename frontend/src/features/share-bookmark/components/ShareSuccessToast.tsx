'use client';

import { memo } from 'react';

export const ShareSuccessToast = memo(function ShareSuccessToast({
  message,
}: {
  message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-sm font-medium text-success"
      role="status"
    >
      {message}
    </p>
  );
});
