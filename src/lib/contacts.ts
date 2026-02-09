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
  
  if (typeof contacts === 'string') {
    try {
      return JSON.parse(contacts) as Contact[];
    } catch {
      return [];
    }
  }
  
  if (Array.isArray(contacts)) {
    return contacts as Contact[];
  }
  
  return [];
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
