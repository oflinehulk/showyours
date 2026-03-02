import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase, mockSupabaseResponse, resetMockResponse } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => import('@/test/mocks/supabase'));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: {}, loading: false })),
}));

import { useProfiles, useProfile, useMyProfile, useCreateProfile, useUpdateProfile } from './useProfiles';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockProfiles = [
  { id: 'p1', user_id: 'user-1', ign: 'Player1', rank: 'mythic', main_role: 'gold', looking_for_squad: true, created_at: '2024-01-01' },
  { id: 'p2', user_id: 'user-2', ign: 'Player2', rank: 'legend', main_role: 'exp', looking_for_squad: true, created_at: '2024-01-02' },
];

describe('useProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns profiles', async () => {
    // useProfiles makes two queries: squad_members then profiles
    // The mock returns the same response for both, but the first is for squad_members
    mockSupabaseResponse(mockProfiles);

    const { result } = renderHook(() => useProfiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('squad_members');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('handles error', async () => {
    mockSupabaseResponse(null, { message: 'Failed to fetch' });

    const { result } = renderHook(() => useProfiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns a single profile', async () => {
    mockSupabaseResponse(mockProfiles[0]);

    const { result } = renderHook(() => useProfile('p1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfiles[0]);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useProfile(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useMyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns the authenticated users profile', async () => {
    mockSupabaseResponse(mockProfiles[0]);

    const { result } = renderHook(() => useMyProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfiles[0]);
  });
});

describe('useCreateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('creates a profile', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSupabaseResponse(mockProfiles[0]);

    const { result } = renderHook(() => useCreateProfile(), { wrapper: createWrapper() });

    result.current.mutate({
      ign: 'Player1', rank: 'mythic' as any, main_role: 'gold' as any,
      hero_class: 'marksman' as any, state: 'maharashtra' as any,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('updates a profile', async () => {
    mockSupabaseResponse(mockProfiles[0]);

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'p1', ign: 'NewName' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});
