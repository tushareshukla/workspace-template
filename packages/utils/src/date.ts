/**
 * Date utilities using Luxon
 * Provides consistent date/time handling across the application
 */
import { DateTime, Duration, Interval, Settings } from 'luxon';

// Configure Luxon defaults
Settings.defaultZone = 'utc';

/**
 * Create a DateTime from various input types
 */
export function toDateTime(
  input: Date | string | number | DateTime | null | undefined
): DateTime {
  if (!input) {
    return DateTime.now();
  }

  if (DateTime.isDateTime(input)) {
    return input;
  }

  if (input instanceof Date) {
    return DateTime.fromJSDate(input);
  }

  if (typeof input === 'number') {
    return DateTime.fromMillis(input);
  }

  if (typeof input === 'string') {
    // Try ISO first, then various formats
    const parsed = DateTime.fromISO(input);
    if (parsed.isValid) return parsed;

    const fromSQL = DateTime.fromSQL(input);
    if (fromSQL.isValid) return fromSQL;

    const fromHTTP = DateTime.fromHTTP(input);
    if (fromHTTP.isValid) return fromHTTP;
  }

  return DateTime.now();
}

/**
 * Format relative time (e.g., "2 hours ago", "in 5 minutes")
 */
export function formatRelativeTime(
  input: Date | string | number | DateTime | null | undefined,
  options: { addSuffix?: boolean; includeSeconds?: boolean } = {}
): string {
  const { addSuffix = true, includeSeconds = true } = options;
  const dt = toDateTime(input);
  const now = DateTime.now();
  const diff = now.diff(dt, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);

  const abs = (n: number) => Math.abs(Math.floor(n));
  const isPast = dt < now;

  let result: string;

  if (abs(diff.years) >= 1) {
    result = `${abs(diff.years)} year${abs(diff.years) !== 1 ? 's' : ''}`;
  } else if (abs(diff.months) >= 1) {
    result = `${abs(diff.months)} month${abs(diff.months) !== 1 ? 's' : ''}`;
  } else if (abs(diff.days) >= 1) {
    result = `${abs(diff.days)} day${abs(diff.days) !== 1 ? 's' : ''}`;
  } else if (abs(diff.hours) >= 1) {
    result = `${abs(diff.hours)} hour${abs(diff.hours) !== 1 ? 's' : ''}`;
  } else if (abs(diff.minutes) >= 1) {
    result = `${abs(diff.minutes)} minute${abs(diff.minutes) !== 1 ? 's' : ''}`;
  } else if (includeSeconds && abs(diff.seconds) >= 10) {
    result = `${abs(diff.seconds)} seconds`;
  } else {
    return 'just now';
  }

  if (!addSuffix) return result;
  return isPast ? `${result} ago` : `in ${result}`;
}

/**
 * Format relative time in a short format (e.g., "2h", "5m")
 */
export function formatRelativeTimeShort(
  input: Date | string | number | DateTime | null | undefined
): string {
  const dt = toDateTime(input);
  const now = DateTime.now();
  const diff = now.diff(dt, ['days', 'hours', 'minutes', 'seconds']);

  const abs = (n: number) => Math.abs(Math.floor(n));

  if (abs(diff.days) >= 1) {
    return `${abs(diff.days)}d`;
  } else if (abs(diff.hours) >= 1) {
    return `${abs(diff.hours)}h`;
  } else if (abs(diff.minutes) >= 1) {
    return `${abs(diff.minutes)}m`;
  } else if (abs(diff.seconds) >= 10) {
    return `${abs(diff.seconds)}s`;
  }
  return 'now';
}

/**
 * Format date for display
 */
export function formatDate(
  input: Date | string | number | DateTime | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' | string = 'medium'
): string {
  const dt = toDateTime(input);

  switch (format) {
    case 'short':
      return dt.toLocaleString(DateTime.DATE_SHORT);
    case 'medium':
      return dt.toLocaleString(DateTime.DATE_MED);
    case 'long':
      return dt.toLocaleString(DateTime.DATE_FULL);
    case 'full':
      return dt.toLocaleString(DateTime.DATETIME_FULL);
    default:
      return dt.toFormat(format);
  }
}

/**
 * Format time for display
 */
export function formatTime(
  input: Date | string | number | DateTime | null | undefined,
  format: 'short' | 'medium' | 'long' | string = 'short'
): string {
  const dt = toDateTime(input);

  switch (format) {
    case 'short':
      return dt.toLocaleString(DateTime.TIME_SIMPLE);
    case 'medium':
      return dt.toLocaleString(DateTime.TIME_WITH_SECONDS);
    case 'long':
      return dt.toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET);
    default:
      return dt.toFormat(format);
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(
  input: Date | string | number | DateTime | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' | string = 'medium'
): string {
  const dt = toDateTime(input);

  switch (format) {
    case 'short':
      return dt.toLocaleString(DateTime.DATETIME_SHORT);
    case 'medium':
      return dt.toLocaleString(DateTime.DATETIME_MED);
    case 'long':
      return dt.toLocaleString(DateTime.DATETIME_FULL);
    case 'full':
      return dt.toLocaleString(DateTime.DATETIME_HUGE);
    default:
      return dt.toFormat(format);
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(
  milliseconds: number,
  options: { compact?: boolean; units?: ('days' | 'hours' | 'minutes' | 'seconds')[] } = {}
): string {
  const { compact = false, units = ['hours', 'minutes', 'seconds'] } = options;
  const duration = Duration.fromMillis(Math.abs(milliseconds));

  if (compact) {
    if (duration.as('days') >= 1) return `${Math.floor(duration.as('days'))}d`;
    if (duration.as('hours') >= 1) return `${Math.floor(duration.as('hours'))}h`;
    if (duration.as('minutes') >= 1) return `${Math.floor(duration.as('minutes'))}m`;
    return `${Math.floor(duration.as('seconds'))}s`;
  }

  const parts: string[] = [];
  const d = duration.shiftTo(...units);

  if (units.includes('days') && d.days >= 1) {
    parts.push(`${Math.floor(d.days)} day${d.days !== 1 ? 's' : ''}`);
  }
  if (units.includes('hours') && d.hours >= 1) {
    parts.push(`${Math.floor(d.hours)} hour${d.hours !== 1 ? 's' : ''}`);
  }
  if (units.includes('minutes') && d.minutes >= 1) {
    parts.push(`${Math.floor(d.minutes)} minute${d.minutes !== 1 ? 's' : ''}`);
  }
  if (units.includes('seconds') && d.seconds >= 1) {
    parts.push(`${Math.floor(d.seconds)} second${d.seconds !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(', ') : '0 seconds';
}

/**
 * Check if a date is today
 */
export function isToday(input: Date | string | number | DateTime): boolean {
  const dt = toDateTime(input);
  return dt.hasSame(DateTime.now(), 'day');
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(input: Date | string | number | DateTime): boolean {
  const dt = toDateTime(input);
  return dt.hasSame(DateTime.now().minus({ days: 1 }), 'day');
}

/**
 * Check if a date is within the last N days
 */
export function isWithinDays(
  input: Date | string | number | DateTime,
  days: number
): boolean {
  const dt = toDateTime(input);
  const threshold = DateTime.now().minus({ days });
  return dt >= threshold;
}

/**
 * Get start of day, week, month, or year
 */
export function startOf(
  input: Date | string | number | DateTime,
  unit: 'day' | 'week' | 'month' | 'year'
): DateTime {
  return toDateTime(input).startOf(unit);
}

/**
 * Get end of day, week, month, or year
 */
export function endOf(
  input: Date | string | number | DateTime,
  unit: 'day' | 'week' | 'month' | 'year'
): DateTime {
  return toDateTime(input).endOf(unit);
}

/**
 * Add duration to a date
 */
export function addDuration(
  input: Date | string | number | DateTime,
  duration: { years?: number; months?: number; days?: number; hours?: number; minutes?: number; seconds?: number }
): DateTime {
  return toDateTime(input).plus(duration);
}

/**
 * Subtract duration from a date
 */
export function subtractDuration(
  input: Date | string | number | DateTime,
  duration: { years?: number; months?: number; days?: number; hours?: number; minutes?: number; seconds?: number }
): DateTime {
  return toDateTime(input).minus(duration);
}

/**
 * Get difference between two dates
 */
export function getDifference(
  start: Date | string | number | DateTime,
  end: Date | string | number | DateTime,
  unit: 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' = 'milliseconds'
): number {
  const startDt = toDateTime(start);
  const endDt = toDateTime(end);
  return endDt.diff(startDt, unit)[unit];
}

/**
 * Convert to ISO string
 */
export function toISO(input: Date | string | number | DateTime): string {
  return toDateTime(input).toISO() ?? new Date().toISOString();
}

/**
 * Convert to JS Date
 */
export function toJSDate(input: Date | string | number | DateTime): Date {
  return toDateTime(input).toJSDate();
}

/**
 * Convert to Unix timestamp (seconds)
 */
export function toUnix(input: Date | string | number | DateTime): number {
  return toDateTime(input).toUnixInteger();
}

/**
 * Convert to milliseconds timestamp
 */
export function toMillis(input: Date | string | number | DateTime): number {
  return toDateTime(input).toMillis();
}

// Re-export Luxon types for convenience
export { DateTime, Duration, Interval, Settings };
