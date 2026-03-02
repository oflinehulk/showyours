import { vi } from 'vitest';

let _mockData: unknown = null;
let _mockError: { message: string } | null = null;
let _mockCount: number | null = null;

export function mockSupabaseResponse(data: unknown, error?: { message: string } | null, count?: number) {
  _mockData = data;
  _mockError = error ?? null;
  _mockCount = count ?? null;
}

export function resetMockResponse() {
  _mockData = null;
  _mockError = null;
  _mockCount = null;
}

function createQueryBuilder() {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'or', 'not', 'filter', 'match', 'textSearch',
  ];

  chainMethods.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });

  // Make the builder thenable so `await supabase.from(...).select(...)` works
  builder.then = (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
    const result = { data: _mockData, error: _mockError, count: _mockCount };
    return Promise.resolve(result).then(resolve, reject);
  };

  return builder;
}

export const supabase = {
  from: vi.fn(() => createQueryBuilder()),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test.png' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.png' } })),
    })),
  },
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
};
