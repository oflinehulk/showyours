import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase, mockSupabaseResponse, resetMockResponse } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => import('@/test/mocks/supabase'));

import { useHeroes, useAllHeroes, useHeroesByClass, useAddHero, useDeleteHero } from './useHeroes';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockHeroes = [
  { id: '1', name: 'Layla', hero_class: 'marksman', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Tigreal', hero_class: 'tank', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

describe('useHeroes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns active heroes', async () => {
    mockSupabaseResponse(mockHeroes);
    const { result } = renderHook(() => useHeroes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHeroes);
    expect(supabase.from).toHaveBeenCalledWith('heroes');
  });

  it('handles error', async () => {
    mockSupabaseResponse(null, { message: 'Database error' });
    const { result } = renderHook(() => useHeroes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Database error');
  });

  it('useAllHeroes returns all heroes', async () => {
    mockSupabaseResponse(mockHeroes);
    const { result } = renderHook(() => useAllHeroes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHeroes);
  });

  it('useHeroesByClass returns heroes filtered by class', async () => {
    const marksmen = [mockHeroes[0]];
    mockSupabaseResponse(marksmen);
    const { result } = renderHook(() => useHeroesByClass('marksman'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(marksmen);
  });

  it('useHeroesByClass is disabled when heroClass is empty', () => {
    const { result } = renderHook(() => useHeroesByClass(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useAddHero calls insert', async () => {
    const newHero = { id: '3', name: 'Miya', hero_class: 'marksman', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' };
    mockSupabaseResponse(newHero);
    const { result } = renderHook(() => useAddHero(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'Miya', hero_class: 'marksman' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('heroes');
  });

  it('useDeleteHero calls delete', async () => {
    mockSupabaseResponse(null);
    const { result } = renderHook(() => useDeleteHero(), { wrapper: createWrapper() });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('heroes');
  });
});
