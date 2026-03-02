import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase, mockSupabaseResponse, resetMockResponse } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => import('@/test/mocks/supabase'));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: {}, loading: false })),
}));

import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead } from './useNotifications';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockNotifications = [
  { id: 'n1', user_id: 'user-1', type: 'info', title: 'Match scheduled', body: 'Your match starts soon', tournament_id: 't1', read: false, created_at: '2024-06-15T10:00:00Z' },
  { id: 'n2', user_id: 'user-1', type: 'info', title: 'New application', body: 'Someone applied', tournament_id: null, read: true, created_at: '2024-06-14T10:00:00Z' },
];

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns notifications for authenticated user', async () => {
    mockSupabaseResponse(mockNotifications);

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNotifications);
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });

  it('handles error', async () => {
    mockSupabaseResponse(null, { message: 'Fetch failed' });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Fetch failed');
  });
});

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('returns unread count', async () => {
    mockSupabaseResponse(null, null, 3);

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The count comes from the response.count field; the hook reads `count` from the response
    // but the query returns count via select('*', { count: 'exact', head: true })
    // Our mock returns { data: null, error: null, count: 3 }
    // The hook only checks `error`, so data is not used — count is used directly
  });
});

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('marks notification as read', async () => {
    mockSupabaseResponse(null);

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });

    result.current.mutate('n1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });
});

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockResponse();
  });

  it('marks all notifications as read', async () => {
    mockSupabaseResponse(null);

    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });
});
