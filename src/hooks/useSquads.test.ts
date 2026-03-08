import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase, mockSupabaseResponse, resetMockResponse } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => import('@/test/mocks/supabase'));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: {}, loading: false })),
}));

import { useSquads, useSquad, useMySquads, useCreateSquad, useDeleteSquad } from './useSquads';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSquads = [
  { id: 's1', owner_id: 'user-1', name: 'Alpha Squad', is_recruiting: true, member_count: 3, created_at: '2024-01-01' },
  { id: 's2', owner_id: 'user-2', name: 'Beta Squad', is_recruiting: false, member_count: 5, created_at: '2024-01-02' },
];

describe('useSquads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns squads', async () => {
    mockSupabaseResponse(mockSquads);

    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('squads');
  });

  it('handles error', async () => {
    mockSupabaseResponse(null, { message: 'DB error' });

    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('DB error');
  });
});

describe('useSquad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns a single squad', async () => {
    mockSupabaseResponse(mockSquads[0]);

    const { result } = renderHook(() => useSquad('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSquads[0]);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useSquad(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useMySquads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns squads owned by the user', async () => {
    mockSupabaseResponse([mockSquads[0]]);

    const { result } = renderHook(() => useMySquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCreateSquad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('creates a squad', async () => {
    // useCreateSquad calls supabase.auth.getUser() first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } as any }, error: null });
    // Mock response for all chained queries (existing squads check, membership check, profile check, insert)
    mockSupabaseResponse(mockSquads[0]);

    const { result } = renderHook(() => useCreateSquad(), { wrapper: createWrapper() });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial mock input
    result.current.mutate({ name: 'Alpha Squad', min_rank: 'epic', needed_roles: ['gold'], max_members: 5 } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('squads');
  });
});

describe('useDeleteSquad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('deletes a squad', async () => {
    mockSupabaseResponse(null);

    const { result } = renderHook(() => useDeleteSquad(), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('squads');
  });
});
