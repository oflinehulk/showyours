import type { ContactTypeId } from './constants';

export interface Contact {
  type: ContactTypeId;
  value: string;
}

/**
 * Safely parse contacts from database (handles both string and JSONB formats)
 */
export function parseContacts(contacts: unknown): Contact[] {
  if (!contacts) return [];

  let arr: unknown[];

  if (typeof contacts === 'string') {
    try {
      const parsed = JSON.parse(contacts);
      if (!Array.isArray(parsed)) return [];
      arr = parsed;
    } catch {
      return [];
    }
  } else if (Array.isArray(contacts)) {
    arr = contacts;
  } else {
    return [];
  }

  // Validate each entry has type and value strings
  return arr.filter(
    (item): item is Contact =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as any).type === 'string' &&
      typeof (item as any).value === 'string'
  );
}

/**
 * Get a specific contact type value
 */
export function getContactValue(contacts: unknown, type: ContactTypeId): string | undefined {
  const parsed = parseContacts(contacts);
  return parsed.find(c => c.type === type)?.value;
}

/**
 * Check if contacts have a specific type with a value
 */
export function hasContactType(contacts: unknown, type: ContactTypeId): boolean {
  const value = getContactValue(contacts, type);
  return !!value && value.trim().length > 0;
}
