import { describe, expect, it } from 'vitest';
import { CommentServiceError } from '../types/errors';
import { CommentValidationService } from './commentValidationService';

describe('CommentValidationService', () => {
  const service = new CommentValidationService();

  it('trims valid text and rejects empty comments', () => {
    expect(service.validate('  A useful thought  ')).toBe('A useful thought');
    expect(() => service.validate(' \n\t ')).toThrow(CommentServiceError);
  });

  it('measures Unicode code points consistently with the database length check', () => {
    expect(service.validate('😀'.repeat(2000))).toHaveLength(4000);
    expect(() => service.validate('😀'.repeat(2001))).toThrow(
      '2,000 characters or fewer',
    );
  });

  it('runs optional filters without hard-coding moderation behavior', () => {
    const filtered = new CommentValidationService([
      (content) =>
        content.includes('blocked phrase')
          ? 'Please revise this comment.'
          : null,
    ]);

    expect(() => filtered.validate('blocked phrase')).toThrow(
      'Please revise this comment.',
    );
    expect(filtered.validate('welcome')).toBe('welcome');
  });
});
