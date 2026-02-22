import { describe, it, expect } from 'vitest';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinBracket,
} from '@/lib/bracket-utils';

describe('generateSingleEliminationBracket', () => {
  const tournamentId = 'test-tournament-1';

  it('generates correct bracket for 4 squads', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    // 4 squads = 2 round-1 matches + 1 finals = 3 total
    expect(matches).toHaveLength(3);

    // Round 1: 2 matches
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(2);
    expect(round1[0].squad_a_id).toBe('s1');
    expect(round1[0].squad_b_id).toBe('s2');
    expect(round1[1].squad_a_id).toBe('s3');
    expect(round1[1].squad_b_id).toBe('s4');

    // Finals
    const finals = matches.filter((m) => m.bracket_type === 'finals');
    expect(finals).toHaveLength(1);
    expect(finals[0].best_of).toBe(5);
    expect(finals[0].squad_a_id).toBeNull();
    expect(finals[0].squad_b_id).toBeNull();
  });

  it('generates correct bracket for 8 squads', () => {
    const squads = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    // 8 squads = 4 + 2 + 1 = 7 matches
    expect(matches).toHaveLength(7);

    const round1 = matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(4);

    const round2 = matches.filter((m) => m.round === 2);
    expect(round2).toHaveLength(2);

    const finals = matches.filter((m) => m.bracket_type === 'finals');
    expect(finals).toHaveLength(1);
  });

  it('pads non-power-of-2 squads with byes', () => {
    const squads = ['s1', 's2', 's3']; // 3 squads → pads to 4
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    // Padded to 4: 2 round-1 + 1 finals = 3
    expect(matches).toHaveLength(3);

    const round1 = matches.filter((m) => m.round === 1);

    // One match should have a bye (null squad_b)
    const byeMatch = round1.find((m) => m.squad_b_id === null);
    expect(byeMatch).toBeDefined();
    expect(byeMatch!.squad_a_id).toBe('s3');
  });

  it('assigns correct best_of values', () => {
    const squads = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    const finals = matches.find((m) => m.bracket_type === 'finals');
    expect(finals!.best_of).toBe(5);

    // Semi-finals (round 2 for 8 teams)
    const semis = matches.filter((m) => m.round === 2);
    semis.forEach((m) => expect(m.best_of).toBe(3));
  });

  it('all matches start as pending with 0-0 score', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    matches.forEach((m) => {
      expect(m.status).toBe('pending');
      expect(m.squad_a_score).toBe(0);
      expect(m.squad_b_score).toBe(0);
      expect(m.winner_id).toBeNull();
      expect(m.tournament_id).toBe(tournamentId);
    });
  });

  it('generates correct match numbers', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateSingleEliminationBracket(tournamentId, squads);

    const round1 = matches.filter((m) => m.round === 1);
    expect(round1.map((m) => m.match_number)).toEqual([1, 2]);
  });
});

describe('generateDoubleEliminationBracket', () => {
  const tournamentId = 'test-tournament-2';

  it('includes winners bracket, losers bracket, and grand finals', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateDoubleEliminationBracket(tournamentId, squads);

    const winners = matches.filter((m) => m.bracket_type === 'winners');
    const losers = matches.filter((m) => m.bracket_type === 'losers');
    const finals = matches.filter((m) => m.bracket_type === 'finals');

    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
    expect(finals).toHaveLength(1);
  });

  it('grand finals is Bo5', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateDoubleEliminationBracket(tournamentId, squads);

    const finals = matches.find((m) => m.bracket_type === 'finals');
    expect(finals!.best_of).toBe(5);
  });

  it('first round has correct squad assignments', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateDoubleEliminationBracket(tournamentId, squads);

    const round1Winners = matches.filter((m) => m.round === 1 && m.bracket_type === 'winners');
    expect(round1Winners).toHaveLength(2);
    expect(round1Winners[0].squad_a_id).toBe('s1');
    expect(round1Winners[0].squad_b_id).toBe('s2');
  });
});

describe('generateRoundRobinBracket', () => {
  const tournamentId = 'test-tournament-3';

  it('generates n*(n-1)/2 matches for n squads', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateRoundRobinBracket(tournamentId, squads);

    // 4 choose 2 = 6
    expect(matches).toHaveLength(6);
  });

  it('every pair plays exactly once', () => {
    const squads = ['s1', 's2', 's3'];
    const matches = generateRoundRobinBracket(tournamentId, squads);

    // 3 choose 2 = 3
    expect(matches).toHaveLength(3);

    const pairs = matches.map((m) => [m.squad_a_id, m.squad_b_id].sort().join('-'));
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(3);
  });

  it('all matches are in round 1', () => {
    const squads = ['s1', 's2', 's3', 's4'];
    const matches = generateRoundRobinBracket(tournamentId, squads);

    matches.forEach((m) => {
      expect(m.round).toBe(1);
    });
  });

  it('all matches are Bo1', () => {
    const squads = ['s1', 's2', 's3'];
    const matches = generateRoundRobinBracket(tournamentId, squads);

    matches.forEach((m) => {
      expect(m.best_of).toBe(1);
    });
  });

  it('all squads have opponents assigned (no byes)', () => {
    const squads = ['s1', 's2', 's3'];
    const matches = generateRoundRobinBracket(tournamentId, squads);

    matches.forEach((m) => {
      expect(m.squad_a_id).not.toBeNull();
      expect(m.squad_b_id).not.toBeNull();
    });
  });
});
