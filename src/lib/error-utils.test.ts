import { getUserFriendlyMessage } from './error-utils';

describe('getUserFriendlyMessage', () => {
  it('maps exact Supabase auth errors', () => {
    expect(getUserFriendlyMessage(new Error('Invalid login credentials')))
      .toBe('Incorrect email or password.');
    expect(getUserFriendlyMessage(new Error('Email not confirmed')))
      .toBe('Please verify your email before signing in.');
    expect(getUserFriendlyMessage(new Error('User already registered')))
      .toBe('An account with this email already exists.');
  });

  it('maps partial match Supabase errors', () => {
    expect(getUserFriendlyMessage(new Error('new row violates row-level security policy for profiles')))
      .toBe("You don't have permission to perform this action.");
    expect(getUserFriendlyMessage(new Error('duplicate key value violates unique constraint "profiles_pkey"')))
      .toBe('This record already exists.');
    expect(getUserFriendlyMessage(new Error('update or delete on table "squads" violates foreign key constraint')))
      .toBe('This action references data that no longer exists.');
  });

  it('handles network errors', () => {
    expect(getUserFriendlyMessage(new Error('Failed to fetch')))
      .toBe('Unable to connect. Please check your internet connection and try again.');
    expect(getUserFriendlyMessage(new Error('NetworkError when attempting to fetch resource')))
      .toBe('Unable to connect. Please check your internet connection and try again.');
    expect(getUserFriendlyMessage(new Error('Load failed')))
      .toBe('Unable to connect. Please check your internet connection and try again.');
  });

  it('handles rate limiting', () => {
    expect(getUserFriendlyMessage(new Error('429 Too Many Requests')))
      .toBe('Too many requests. Please wait a moment and try again.');
    expect(getUserFriendlyMessage(new Error('Rate limit exceeded')))
      .toBe('Too many requests. Please wait a moment and try again.');
  });

  it('handles timeout errors', () => {
    expect(getUserFriendlyMessage(new Error('Request timeout')))
      .toBe('The request timed out. Please try again.');
  });

  it('returns generic message for unknown errors', () => {
    expect(getUserFriendlyMessage(new Error('some_internal_pg_error_12345')))
      .toBe('Something went wrong. Please try again.');
  });

  it('handles non-Error values', () => {
    expect(getUserFriendlyMessage('string error')).toBe('Something went wrong. Please try again.');
    expect(getUserFriendlyMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getUserFriendlyMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(getUserFriendlyMessage(42)).toBe('Something went wrong. Please try again.');
  });

  it('never exposes raw technical error text', () => {
    const technicalErrors = [
      'relation "public.profiles" does not exist',
      'column "foo" of relation "bar" does not exist',
      'syntax error at or near "SELECT"',
      'permission denied for schema public',
    ];
    for (const msg of technicalErrors) {
      const result = getUserFriendlyMessage(new Error(msg));
      expect(result).not.toContain('relation');
      expect(result).not.toContain('column');
      expect(result).not.toContain('syntax');
      expect(result).not.toContain('schema');
    }
  });
});
