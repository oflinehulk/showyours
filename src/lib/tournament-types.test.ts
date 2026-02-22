import { describe, it, expect } from 'vitest';
import {
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  MATCH_STATUS_LABELS,
  MAX_SQUAD_SIZES,
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
