import { MessageCircle } from 'lucide-react';

export function CommentEmpty() {
  return (
    <div className="grid min-h-36 place-items-center px-6 py-8 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">
          Start the conversation
        </p>
        <p className="mt-1 text-sm text-muted">
          Be the first to share a thoughtful comment.
        </p>
      </div>
    </div>
  );
}
