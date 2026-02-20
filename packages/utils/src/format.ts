/**
 * Formatting utilities using numeral.js
 * Provides consistent number formatting across the application
 */
import numeral from 'numeral';

/**
 * Format a number with abbreviation (e.g., 1.2K, 3.5M)
 */
export function formatNumber(value: number, format: string = '0.[0]a'): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }
  return numeral(value).format(format);
}

/**
 * Format a number as compact (e.g., 1.2K, 3.5M, 2.1B)
 */
export function formatCompact(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1e12) {
    return numeral(value).format('0.[00]t');
  }
  if (absValue >= 1e9) {
    return numeral(value).format('0.[00]b');
  }
  if (absValue >= 1e6) {
    return numeral(value).format('0.[0]m');
  }
  if (absValue >= 1e3) {
    return numeral(value).format('0.[0]k');
  }

  return numeral(value).format('0,0');
}

/**
 * Format a number with thousand separators
 */
export function formatWithCommas(value: number, decimals: number = 0): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  const format = decimals > 0 ? `0,0.${'0'.repeat(decimals)}` : '0,0';
  return numeral(value).format(format);
}

/**
 * Format as percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  const format = decimals > 0 ? `0.${'0'.repeat(decimals)}%` : '0%';
  return numeral(value).format(format);
}

/**
 * Format as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}

/**
 * Format as ordinal (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0th';
  }

  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = value % 100;

  return value + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Format token count (AI tokens)
 */
export function formatTokens(tokens: number): string {
  if (typeof tokens !== 'number' || isNaN(tokens)) {
    return '0';
  }

  if (tokens >= 1e6) {
    return `${(tokens / 1e6).toFixed(1)}M`;
  }
  if (tokens >= 1e3) {
    return `${(tokens / 1e3).toFixed(1)}K`;
  }

  return tokens.toString();
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const pluralForm = plural ?? `${singular}s`;
  return count === 1 ? singular : pluralForm;
}

/**
 * Format count with label (e.g., "5 items", "1 item")
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string
): string {
  return `${formatWithCommas(count)} ${pluralize(count, singular, plural)}`;
}
