import { CommentServiceError } from '../types/errors';

export type CommentContentFilter = (content: string) => string | null;

export class CommentValidationService {
  constructor(
    private readonly futureFilters: readonly CommentContentFilter[] = [],
  ) {}

  validate(content: string): string {
    const normalized = content.trim();
    const length = [...normalized].length;

    if (length === 0) {
      throw new CommentServiceError('validation', 'Write a comment first.');
    }
    if (length > 2000) {
      throw new CommentServiceError(
        'validation',
        'Comments must be 2,000 characters or fewer.',
      );
    }

    for (const filter of this.futureFilters) {
      const message = filter(normalized);
      if (message) {
        throw new CommentServiceError('validation', message);
      }
    }

    return normalized;
  }
}

export const commentValidationService = new CommentValidationService();
