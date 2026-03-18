import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase, mockSupabaseResponse, resetMockResponse } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => import('@/test/mocks/supabase'));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: {}, loading: false })),
}));

import { useTournaments, useTournament, useMyTournaments, useCreateTournament, useDeleteTournament } from './useTournamentCore';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockTournaments = [
  { id: 't1', host_id: 'user-1', name: 'MLBB Cup', status: 'registration_open', created_at: '2024-01-01' },
  { id: 't2', host_id: 'user-2', name: 'Grand Finals', status: 'ongoing', created_at: '2024-01-02' },
];

describe('useTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns tournaments', async () => {
    mockSupabaseResponse(mockTournaments);

    const { result } = renderHook(() => useTournaments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTournaments.map(t => ({ ...t, registrations_count: 0 })));
    expect(supabase.from).toHaveBeenCalledWith('tournaments');
  });

  it('handles error', async () => {
    mockSupabaseResponse(null, { message: 'Server error' });

    const { result } = renderHook(() => useTournaments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });
});

describe('useTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns a single tournament', async () => {
    mockSupabaseResponse(mockTournaments[0]);

    const { result } = renderHook(() => useTournament('t1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTournaments[0]);
  });

  it('is disabled when id is undefined', () => {
    const { result } = renderHook(() => useTournament(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useMyTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns tournaments hosted by user', async () => {
    mockSupabaseResponse([mockTournaments[0]]);

    const { result } = renderHook(() => useMyTournaments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCreateTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('creates a tournament', async () => {
    mockSupabaseResponse(mockTournaments[0]);

    const { result } = renderHook(() => useCreateTournament(), { wrapper: createWrapper() });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial mock input
    result.current.mutate({ name: 'MLBB Cup', max_squads: 16, date_time: '2024-06-15T14:00:00Z' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('tournaments');
  });
});

describe('useDeleteTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('deletes a tournament', async () => {
    const { result } = renderHook(() => useDeleteTournament(), { wrapper: createWrapper() });

    result.current.mutate('t1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.rpc).toHaveBeenCalledWith('rpc_delete_tournament_cascade', { p_tournament_id: 't1' });
  });
});
