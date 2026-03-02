import { profileSchema, squadSchema, applicationSchema } from './validations';

describe('profileSchema', () => {
  const validProfile = {
    ign: 'TestPlayer',
    mlbbId: '12345',
    bio: 'Hello world',
    winRate: '55.5',
    whatsapp: '+91 12345 67890',
    gameId: '12345(6789)',
    discord: 'user#1234',
    instagram: '@user',
  };

  it('accepts valid profile data', () => {
    const result = profileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('requires ign', () => {
    const result = profileSchema.safeParse({ ...validProfile, ign: '' });
    expect(result.success).toBe(false);
  });

  it('rejects ign over 30 chars', () => {
    const result = profileSchema.safeParse({ ...validProfile, ign: 'a'.repeat(31) });
    expect(result.success).toBe(false);
  });

  it('rejects ign with special characters', () => {
    const result = profileSchema.safeParse({ ...validProfile, ign: 'test@user!' });
    expect(result.success).toBe(false);
  });

  it('accepts ign with dots, dashes, underscores, spaces', () => {
    const result = profileSchema.safeParse({ ...validProfile, ign: 'Test_Player.Name-1' });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric mlbbId', () => {
    const result = profileSchema.safeParse({ ...validProfile, mlbbId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts empty mlbbId', () => {
    const result = profileSchema.safeParse({ ...validProfile, mlbbId: '' });
    expect(result.success).toBe(true);
  });

  it('rejects winRate over 100', () => {
    const result = profileSchema.safeParse({ ...validProfile, winRate: '101' });
    expect(result.success).toBe(false);
  });

  it('accepts winRate of 0', () => {
    const result = profileSchema.safeParse({ ...validProfile, winRate: '0' });
    expect(result.success).toBe(true);
  });

  it('accepts empty winRate', () => {
    const result = profileSchema.safeParse({ ...validProfile, winRate: '' });
    expect(result.success).toBe(true);
  });

  it('requires whatsapp', () => {
    const result = profileSchema.safeParse({ ...validProfile, whatsapp: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = profileSchema.safeParse({ ...validProfile, whatsapp: 'not a phone' });
    expect(result.success).toBe(false);
  });

  it('requires gameId', () => {
    const result = profileSchema.safeParse({ ...validProfile, gameId: '' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from ign', () => {
    const result = profileSchema.safeParse({ ...validProfile, ign: '  TestPlayer  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ign).toBe('TestPlayer');
    }
  });
});

describe('squadSchema', () => {
  const validSquad = {
    name: 'Test Squad',
    description: 'A test squad',
    whatsapp: '+91 12345',
    discord: '',
  };

  it('accepts valid squad data', () => {
    const result = squadSchema.safeParse(validSquad);
    expect(result.success).toBe(true);
  });

  it('requires name', () => {
    const result = squadSchema.safeParse({ ...validSquad, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 50 chars', () => {
    const result = squadSchema.safeParse({ ...validSquad, name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('requires description', () => {
    const result = squadSchema.safeParse({ ...validSquad, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description over 1000 chars', () => {
    const result = squadSchema.safeParse({ ...validSquad, description: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });

  it('requires whatsapp', () => {
    const result = squadSchema.safeParse({ ...validSquad, whatsapp: '' });
    expect(result.success).toBe(false);
  });

  it('allows empty discord', () => {
    const result = squadSchema.safeParse({ ...validSquad, discord: '' });
    expect(result.success).toBe(true);
  });
});

describe('applicationSchema', () => {
  it('accepts empty message', () => {
    const result = applicationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts message under 500 chars', () => {
    const result = applicationSchema.safeParse({ message: 'Hello, I want to join!' });
    expect(result.success).toBe(true);
  });

  it('rejects message over 500 chars', () => {
    const result = applicationSchema.safeParse({ message: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
