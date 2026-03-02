import { describe, it, expect } from 'vitest';
import {
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  MATCH_STATUS_LABELS,
  MAX_SQUAD_SIZES,
  validateMatchScores,
} from '@/lib/tournament-types';

describe('Tournament type constants', () => {
  it('TOURNAMENT_STATUS_LABELS covers all statuses', () => {
    const statuses = ['registration_open', 'registration_closed', 'bracket_generated', 'ongoing', 'completed', 'cancelled'];
    statuses.forEach((status) => {
      expect(TOURNAMENT_STATUS_LABELS[status as keyof typeof TOURNAMENT_STATUS_LABELS]).toBeDefined();
      expect(typeof TOURNAMENT_STATUS_LABELS[status as keyof typeof TOURNAMENT_STATUS_LABELS]).toBe('string');
    });
  });

  it('TOURNAMENT_FORMAT_LABELS covers all formats', () => {
    const formats = ['single_elimination', 'double_elimination', 'round_robin'];
    formats.forEach((format) => {
      expect(TOURNAMENT_FORMAT_LABELS[format as keyof typeof TOURNAMENT_FORMAT_LABELS]).toBeDefined();
    });
  });

  it('MATCH_STATUS_LABELS covers all statuses', () => {
    const statuses = ['pending', 'ongoing', 'completed', 'disputed'];
    statuses.forEach((status) => {
      expect(MATCH_STATUS_LABELS[status as keyof typeof MATCH_STATUS_LABELS]).toBeDefined();
    });
  });

  it('MAX_SQUAD_SIZES are powers of 2', () => {
    MAX_SQUAD_SIZES.forEach((size) => {
      expect(Math.log2(size) % 1).toBe(0);
    });
  });

  it('MAX_SQUAD_SIZES are in ascending order', () => {
    for (let i = 1; i < MAX_SQUAD_SIZES.length; i++) {
      expect(MAX_SQUAD_SIZES[i]).toBeGreaterThan(MAX_SQUAD_SIZES[i - 1]);
    }
  });
});

describe('validateMatchScores', () => {
  // Bo1
  it('accepts valid Bo1 result 1-0', () => {
    expect(validateMatchScores(1, 1, 0)).toEqual({ valid: true });
  });

  it('accepts valid Bo1 result 0-1', () => {
    expect(validateMatchScores(1, 0, 1)).toEqual({ valid: true });
  });

  it('rejects Bo1 tie 0-0', () => {
    expect(validateMatchScores(1, 0, 0).valid).toBe(false);
  });

  it('rejects Bo1 with 2-0', () => {
    expect(validateMatchScores(1, 2, 0).valid).toBe(false);
  });

  // Bo3
  it('accepts valid Bo3 result 2-0', () => {
    expect(validateMatchScores(3, 2, 0)).toEqual({ valid: true });
  });

  it('accepts valid Bo3 result 2-1', () => {
    expect(validateMatchScores(3, 2, 1)).toEqual({ valid: true });
  });

  it('accepts valid Bo3 result 1-2', () => {
    expect(validateMatchScores(3, 1, 2)).toEqual({ valid: true });
  });

  it('rejects Bo3 with 3-0', () => {
    expect(validateMatchScores(3, 3, 0).valid).toBe(false);
  });

  it('rejects Bo3 tie 1-1', () => {
    expect(validateMatchScores(3, 1, 1).valid).toBe(false);
  });

  // Bo5
  it('accepts valid Bo5 result 3-0', () => {
    expect(validateMatchScores(5, 3, 0)).toEqual({ valid: true });
  });

  it('accepts valid Bo5 result 3-2', () => {
    expect(validateMatchScores(5, 3, 2)).toEqual({ valid: true });
  });

  it('rejects Bo5 with 4-1', () => {
    expect(validateMatchScores(5, 4, 1).valid).toBe(false);
  });

  // Edge cases
  it('rejects negative scores', () => {
    expect(validateMatchScores(3, -1, 2).valid).toBe(false);
  });

  it('rejects decimal scores', () => {
    expect(validateMatchScores(3, 1.5, 2).valid).toBe(false);
  });
});
