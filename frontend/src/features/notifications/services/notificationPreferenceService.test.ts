import { describe, expect, it } from 'vitest';
import { parseNotificationPreferences } from './notificationPreferenceService';

describe('parseNotificationPreferences', () => {
  it('defaults missing and malformed preference values to enabled', () => {
    expect(
      parseNotificationPreferences({ likes: false, email: false }),
    ).toEqual({
      likes: false,
      comments: true,
      follows: true,
      push: true,
      email: false,
    });
    expect(parseNotificationPreferences(null)).toEqual({
      likes: true,
      comments: true,
      follows: true,
      push: true,
      email: true,
    });
  });
});
