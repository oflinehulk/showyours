import React from 'react';
import { render, renderHook, type RenderOptions, type RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Profile, Squad } from '@/lib/types';
import type { Tournament } from '@/lib/tournament-types';
import type { Hero } from '@/hooks/useHeroes';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
}

export function renderWithClient(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = createTestQueryClient();
  return {
    ...render(ui, { wrapper: createWrapper(queryClient), ...options }),
    queryClient,
  };
}

export function renderHookWithClient<TResult>(
  hook: () => TResult,
  queryClient?: QueryClient,
) {
  const client = queryClient || createTestQueryClient();
  return {
    ...renderHook(hook, { wrapper: createWrapper(client) }),
    queryClient: client,
  };
}

// --- Factories ---

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    ign: 'TestPlayer',
    avatar_url: null,
    rank: 'mythic',
    win_rate: 55.5,
    main_role: 'gold',
    main_roles: ['gold'],
    hero_class: 'marksman',
    favorite_heroes: ['Layla', 'Miya'],
    server: 'sea',
    state: 'maharashtra',
    bio: 'Test bio',
    looking_for_squad: true,
    contacts: [],
    screenshots: [],
    mlbb_id: '123456789',
    has_completed_onboarding: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSquad(overrides: Partial<Squad> = {}): Squad {
  return {
    id: 'squad-1',
    owner_id: 'user-1',
    name: 'Test Squad',
    logo_url: null,
    description: 'A test squad',
    min_rank: 'epic',
    needed_roles: ['gold', 'exp'],
    server: 'sea',
    member_count: 3,
    max_members: 5,
    contacts: [],
    is_recruiting: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    host_id: 'user-1',
    name: 'Test Tournament',
    description: 'A test tournament',
    rules: 'Standard rules',
    date_time: '2024-06-15T14:00:00Z',
    max_squads: 16,
    status: 'registration_open',
    format: 'double_elimination',
    prize_wallet: null,
    banner_url: null,
    prize_pool: '1000 INR',
    team_size: '5',
    entry_fee: 'Free',
    region: 'India',
    contact_info: null,
    prize_tiers: null,
    is_multi_stage: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockHero(overrides: Partial<Hero> = {}): Hero {
  return {
    id: 'hero-1',
    name: 'Layla',
    hero_class: 'marksman',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    user_id: 'user-1',
    type: 'info',
    title: 'Test Notification',
    body: 'This is a test notification',
    tournament_id: null,
    read: false,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
