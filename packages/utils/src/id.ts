/**
 * ID generation utilities using nanoid
 * Provides consistent ID generation across the application
 */
import { nanoid, customAlphabet } from 'nanoid';

/**
 * Generate a random ID with default length (21 characters)
 * Uses URL-safe characters (A-Za-z0-9_-)
 */
export function generateId(size: number = 21): string {
  return nanoid(size);
}

/**
 * Generate a short ID (8 characters)
 * Good for human-readable references
 */
export function generateShortId(): string {
  return nanoid(8);
}

/**
 * Generate a prefixed ID
 * e.g., "task_abc123", "agent_xyz789"
 */
export function generatePrefixedId(prefix: string, size: number = 12): string {
  return `${prefix}_${nanoid(size)}`;
}

// Custom alphabet generators
const lowercaseAlphabet = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);
const uppercaseAlphabet = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const numericAlphabet = customAlphabet('0123456789', 8);
const alphanumericAlphabet = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  12
);
const humanReadableAlphabet = customAlphabet(
  '23456789ABCDEFGHJKLMNPQRSTUVWXYZ', // Excludes 0, 1, I, O for readability
  8
);

/**
 * Generate a lowercase ID
 */
export function generateLowercaseId(size: number = 8): string {
  const generator = customAlphabet('abcdefghijklmnopqrstuvwxyz', size);
  return generator();
}

/**
 * Generate an uppercase ID
 */
export function generateUppercaseId(size: number = 8): string {
  const generator = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', size);
  return generator();
}

/**
 * Generate a numeric ID
 */
export function generateNumericId(size: number = 8): string {
  const generator = customAlphabet('0123456789', size);
  return generator();
}

/**
 * Generate an alphanumeric ID
 */
export function generateAlphanumericId(size: number = 12): string {
  const generator = customAlphabet(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    size
  );
  return generator();
}

/**
 * Generate a human-readable ID (excludes confusing characters)
 * Useful for codes users need to type or read aloud
 */
export function generateHumanReadableId(size: number = 8): string {
  const generator = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', size);
  return generator();
}

/**
 * Generate a slug-safe ID (lowercase alphanumeric with hyphens)
 */
export function generateSlugId(size: number = 8): string {
  const generator = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', size);
  return generator();
}

/**
 * ID prefixes for different entity types
 */
export const ID_PREFIXES = {
  TASK: 'task',
  AGENT: 'agent',
  ACTIVITY: 'act',
  BLOCK: 'blk',
  COMMENT: 'cmt',
  USER: 'usr',
  SESSION: 'sess',
  WORKSPACE: 'ws',
  MESSAGE: 'msg',
  RUN: 'run',
} as const;

/**
 * Generate entity-specific IDs
 */
export const ids = {
  task: () => generatePrefixedId(ID_PREFIXES.TASK),
  agent: () => generatePrefixedId(ID_PREFIXES.AGENT),
  activity: () => generatePrefixedId(ID_PREFIXES.ACTIVITY),
  block: () => generatePrefixedId(ID_PREFIXES.BLOCK),
  comment: () => generatePrefixedId(ID_PREFIXES.COMMENT),
  user: () => generatePrefixedId(ID_PREFIXES.USER),
  session: () => generatePrefixedId(ID_PREFIXES.SESSION),
  workspace: () => generatePrefixedId(ID_PREFIXES.WORKSPACE),
  message: () => generatePrefixedId(ID_PREFIXES.MESSAGE),
  run: () => generatePrefixedId(ID_PREFIXES.RUN),
} as const;

/**
 * Validate if a string looks like a valid nanoid
 */
export function isValidNanoId(id: string, expectedSize?: number): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check for URL-safe characters only
  const validChars = /^[A-Za-z0-9_-]+$/;
  if (!validChars.test(id)) {
    return false;
  }

  // Check size if specified
  if (expectedSize !== undefined && id.length !== expectedSize) {
    return false;
  }

  return true;
}

/**
 * Parse a prefixed ID
 */
export function parsePrefixedId(id: string): { prefix: string; value: string } | null {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const parts = id.split('_');
  if (parts.length !== 2) {
    return null;
  }

  return {
    prefix: parts[0],
    value: parts[1],
  };
}
