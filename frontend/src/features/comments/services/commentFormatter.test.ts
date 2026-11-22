import { describe, expect, it } from 'vitest';
import { CommentFormatter } from './commentFormatter';

describe('CommentFormatter', () => {
  it('formats counts compactly and handles invalid timestamps safely', () => {
    const formatter = new CommentFormatter();

    expect(formatter.formatCount(1200)).toBe('1.2K');
    expect(formatter.formatRelativeTime('not-a-date')).toBe('Unknown time');
    expect(formatter.formatDateTime('not-a-date')).toBe('Unknown date');
  });
});
