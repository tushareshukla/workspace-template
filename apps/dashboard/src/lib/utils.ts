/**
 * UI utility functions
 * Uses shared @workspace/utils for date/number formatting
 */
import { clsx, type ClassValue } from 'clsx';

// Re-export from shared utils
export {
  formatRelativeTime,
  formatRelativeTimeShort,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  isToday,
  isYesterday,
  toDateTime,
} from '@workspace/utils/date';

export {
  formatNumber,
  formatCompact,
  formatTokens,
  formatBytes,
  formatPercent,
  truncate,
  capitalize,
  toTitleCase,
  pluralize,
  formatCount,
} from '@workspace/utils/format';

export {
  generateId,
  generateShortId,
  ids,
} from '@workspace/utils/id';

/**
 * Merge CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if we're running in a browser
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isBrowser) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idle: 'text-gray-500 bg-gray-100',
    working: 'text-green-600 bg-green-100',
    waiting: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100',
    offline: 'text-gray-400 bg-gray-50',
    inbox: 'text-blue-600 bg-blue-100',
    assigned: 'text-purple-600 bg-purple-100',
    in_progress: 'text-green-600 bg-green-100',
    review: 'text-yellow-600 bg-yellow-100',
    blocked: 'text-red-600 bg-red-100',
    done: 'text-gray-600 bg-gray-100',
  };

  return colors[status] || 'text-gray-500 bg-gray-100';
}

/**
 * Get priority color classes
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'text-gray-500 bg-gray-100',
    normal: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100',
  };

  return colors[priority] || 'text-gray-500 bg-gray-100';
}
