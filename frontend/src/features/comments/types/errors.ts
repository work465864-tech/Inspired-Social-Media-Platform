import type { CommentErrorKind } from './index';

export class CommentServiceError extends Error {
  constructor(
    readonly kind: CommentErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'CommentServiceError';
  }
}
