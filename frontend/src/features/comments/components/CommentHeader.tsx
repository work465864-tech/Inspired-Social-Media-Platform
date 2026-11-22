'use client';

import { MessageCircle } from 'lucide-react';
import { commentFormatter } from '../services/commentFormatter';

export function CommentHeader({ count }: { count: number }) {
  return (
    <div
      aria-live="polite"
      className="mb-3 flex items-center gap-2 text-sm text-muted"
      role="status"
    >
      <MessageCircle aria-hidden="true" className="h-4 w-4" />
      <span>{commentFormatter.formatCount(count)} comments</span>
    </div>
  );
}
