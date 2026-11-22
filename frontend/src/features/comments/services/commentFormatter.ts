const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

const timeUnits: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60 * 60 * 24 * 365, 'year'],
  [60 * 60 * 24 * 30, 'month'],
  [60 * 60 * 24 * 7, 'week'],
  [60 * 60 * 24, 'day'],
  [60 * 60, 'hour'],
  [60, 'minute'],
];

export class CommentFormatter {
  formatCount(count: number): string {
    return compactNumber.format(Math.max(0, count));
  }

  formatRelativeTime(value: string, now = Date.now()): string {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return 'Unknown time';
    }

    const ageInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    const unit = timeUnits.find(([seconds]) => ageInSeconds >= seconds);
    if (!unit) {
      return 'just now';
    }

    return relativeTime.format(-Math.floor(ageInSeconds / unit[0]), unit[1]);
  }

  formatDateTime(value: string): string {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }
}

export const commentFormatter = new CommentFormatter();
