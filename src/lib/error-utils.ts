/**
 * Centralized error utilities for user-facing error messages.
 * Maps Supabase / network error codes to friendly text and strips
 * technical details so raw SQL or internal paths are never shown.
 */

const SUPABASE_ERROR_MAP: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',

  // RLS / permission errors
  'new row violates row-level security policy': 'You don\'t have permission to perform this action.',
  'violates row-level security policy for table': 'You don\'t have permission to perform this action.',

  // Unique constraint violations
  'duplicate key value violates unique constraint': 'This record already exists.',

  // Foreign key violations
  'violates foreign key constraint': 'This action references data that no longer exists.',

  // Not found
  'JSON object requested, multiple (or no) rows returned': 'The requested record was not found.',
};

const NETWORK_ERRORS = [
  'Failed to fetch',
  'NetworkError',
  'Load failed',
  'net::ERR_',
  'AbortError',
];

export function getUserFriendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Check exact matches first
  if (SUPABASE_ERROR_MAP[raw]) return SUPABASE_ERROR_MAP[raw];

  // Check partial matches
  for (const [pattern, friendly] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (raw.includes(pattern)) return friendly;
  }

  // Network errors
  if (NETWORK_ERRORS.some((n) => raw.includes(n))) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Rate limiting
  if (raw.includes('429') || raw.toLowerCase().includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Timeout
  if (raw.toLowerCase().includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  // Fallback — never expose raw error to the user
  return 'Something went wrong. Please try again.';
}
