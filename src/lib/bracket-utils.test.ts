import { describe, it, expect } from 'vitest';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinBracket,
  generateSeededDoubleEliminationBracket,
  computeLBInitialRounds,
  determineSplitAdvancingTeams,
  computeGroupStandings,
} from '@/lib/bracket-utils';
import type { TournamentMatch, TournamentSquad } from '@/lib/tournament-types';

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

// ========== Seeded Double Elimination Tests ==========

describe('computeLBInitialRounds', () => {
  it('returns 0 when no LB teams', () => {
    expect(computeLBInitialRounds(4, 0)).toBe(0);
    expect(computeLBInitialRounds(16, 0)).toBe(0);
  });

  it('returns 1 for equal UB and LB sizes', () => {
    expect(computeLBInitialRounds(4, 4)).toBe(1);
    expect(computeLBInitialRounds(8, 8)).toBe(1);
    expect(computeLBInitialRounds(26, 26)).toBe(1);
  });

  it('returns 2 when LB is double UB', () => {
    expect(computeLBInitialRounds(4, 8)).toBe(2);
    expect(computeLBInitialRounds(8, 16)).toBe(2);
  });

  it('returns 3 when LB is 4x UB', () => {
    expect(computeLBInitialRounds(4, 16)).toBe(3);
  });
});

describe('generateSeededDoubleEliminationBracket', () => {
  const tournamentId = 'test-seeded-de';

  it('falls back to standard DE when no LB teams', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, []);

    const semis = matches.filter(m => m.bracket_type === 'semi_finals');
    expect(semis).toHaveLength(0);

    const finals = matches.filter(m => m.bracket_type === 'finals');
    expect(finals).toHaveLength(1);
  });

  it('generates correct structure for equal UB/LB sizes (k=1)', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const lbSquads = ['l1', 'l2', 'l3', 'l4'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads);

    const winners = matches.filter(m => m.bracket_type === 'winners');
    const losers = matches.filter(m => m.bracket_type === 'losers');
    const semis = matches.filter(m => m.bracket_type === 'semi_finals');
    const finals = matches.filter(m => m.bracket_type === 'finals');

    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
    expect(semis).toHaveLength(1);
    expect(finals).toHaveLength(1);

    // k=1, rUb=2, totalLBRounds = 1 + 2*(2-1) = 3
    const lbRounds = [...new Set(losers.map(m => m.round))].sort((a, b) => a - b);
    expect(lbRounds).toHaveLength(3);
  });

  it('LB round 1 has correct LB team assignments', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const lbSquads = ['l1', 'l2', 'l3', 'l4'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads);

    const lbR1 = matches.filter(m => m.bracket_type === 'losers' && m.round === 1);
    expect(lbR1).toHaveLength(2);

    const allLbR1Squads = lbR1.flatMap(m => [m.squad_a_id, m.squad_b_id]).filter(Boolean);
    expect(allLbR1Squads.sort()).toEqual(['l1', 'l2', 'l3', 'l4']);
  });

  it('WB round 1 has correct UB team assignments', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const lbSquads = ['l1', 'l2', 'l3', 'l4'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads);

    const wbR1 = matches.filter(m => m.bracket_type === 'winners' && m.round === 1);
    expect(wbR1).toHaveLength(2);

    const allWbR1Squads = wbR1.flatMap(m => [m.squad_a_id, m.squad_b_id]).filter(Boolean);
    expect(allWbR1Squads.sort()).toEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('generates correct k for asymmetric UB/LB sizes', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const lbSquads = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads);

    const losers = matches.filter(m => m.bracket_type === 'losers');
    // k=2, R_ub=2, totalLBRounds = 2 + 2*(2-1) = 4
    const lbRounds = [...new Set(losers.map(m => m.round))].sort((a, b) => a - b);
    expect(lbRounds).toHaveLength(4);
  });

  it('handles the 26 UB + 26 LB case (target format)', () => {
    const ubSquads = Array.from({ length: 26 }, (_, i) => `u${i + 1}`);
    const lbSquads = Array.from({ length: 26 }, (_, i) => `l${i + 1}`);
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads, {
      defaultBestOf: 3,
      finalsBestOf: 5,
    });

    const winners = matches.filter(m => m.bracket_type === 'winners');
    const losers = matches.filter(m => m.bracket_type === 'losers');
    const semis = matches.filter(m => m.bracket_type === 'semi_finals');
    const finals = matches.filter(m => m.bracket_type === 'finals');

    // P_ub=32, rUb=5, k=1, totalLBRounds=1+2*4=9
    const wbRounds = [...new Set(winners.map(m => m.round))];
    const lbRounds = [...new Set(losers.map(m => m.round))];
    expect(wbRounds).toHaveLength(5);
    expect(lbRounds).toHaveLength(9);

    expect(semis).toHaveLength(1);
    expect(semis[0].best_of).toBe(5);
    expect(finals).toHaveLength(1);
    expect(finals[0].best_of).toBe(5);

    // WB R1: 16 matches
    expect(winners.filter(m => m.round === 1)).toHaveLength(16);

    // LB R1: 16 matches
    expect(losers.filter(m => m.round === 1)).toHaveLength(16);
  });

  it('semi-final and grand final are created with correct best_of', () => {
    const ubSquads = ['u1', 'u2', 'u3', 'u4'];
    const lbSquads = ['l1', 'l2', 'l3', 'l4'];
    const matches = generateSeededDoubleEliminationBracket(tournamentId, ubSquads, lbSquads, {
      defaultBestOf: 3,
      finalsBestOf: 5,
      semiFinalsBestOf: 5,
    });

    const sf = matches.find(m => m.bracket_type === 'semi_finals');
    expect(sf).toBeDefined();
    expect(sf!.best_of).toBe(5);
    expect(sf!.squad_a_id).toBeNull();
    expect(sf!.squad_b_id).toBeNull();

    const gf = matches.find(m => m.bracket_type === 'finals');
    expect(gf).toBeDefined();
    expect(gf!.best_of).toBe(5);
  });

  it('throws for fewer than 2 UB teams', () => {
    expect(() =>
      generateSeededDoubleEliminationBracket(tournamentId, ['u1'], ['l1', 'l2'])
    ).toThrow('Need at least 2 UB teams');
  });

  it('throws for fewer than 2 LB teams', () => {
    expect(() =>
      generateSeededDoubleEliminationBracket(tournamentId, ['u1', 'u2'], ['l1'])
    ).toThrow('Need at least 2 LB teams');
  });
});

describe('determineSplitAdvancingTeams', () => {
  function makeSquad(id: string): TournamentSquad {
    return {
      id,
      name: `Team ${id}`,
      leader_id: 'leader',
      existing_squad_id: null,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function makeMatch(
    squadAId: string,
    squadBId: string,
    winnerId: string,
    groupId: string,
  ): TournamentMatch {
    return {
      id: `${squadAId}-${squadBId}`,
      tournament_id: 'test',
      round: 1,
      match_number: 1,
      bracket_type: 'winners',
      squad_a_id: squadAId,
      squad_b_id: squadBId,
      winner_id: winnerId,
      status: 'completed',
      best_of: 1,
      squad_a_score: winnerId === squadAId ? 1 : 0,
      squad_b_score: winnerId === squadBId ? 1 : 0,
      result_screenshot: null,
      scheduled_time: null,
      completed_at: new Date().toISOString(),
      stage_id: null,
      group_id: groupId,
      squad_a_checked_in: false,
      squad_b_checked_in: false,
      is_forfeit: false,
      toss_winner: null,
      blue_side_team: null,
      red_side_team: null,
      toss_completed_at: null,
      dispute_reason: null,
      dispute_screenshot: null,
      dispute_raised_by: null,
      dispute_resolved_by: null,
      dispute_resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  it('splits top 2 and bottom 2 correctly in a 4-team group', () => {
    const squads = ['t1', 't2', 't3', 't4'].map(makeSquad);
    const squadMap = new Map(squads.map(s => [s.id, s]));

    const matches: TournamentMatch[] = [
      makeMatch('t1', 't2', 't1', 'g1'),
      makeMatch('t1', 't3', 't1', 'g1'),
      makeMatch('t1', 't4', 't1', 'g1'),
      makeMatch('t2', 't3', 't2', 'g1'),
      makeMatch('t2', 't4', 't2', 'g1'),
      makeMatch('t3', 't4', 't3', 'g1'),
    ];

    const result = determineSplitAdvancingTeams(
      [{ label: 'A', matches, squadMap }],
      2, 2, 0,
    );

    expect(result.upperBracket).toHaveLength(2);
    expect(result.lowerBracket).toHaveLength(2);

    const ubIds = result.upperBracket.map(t => t.squadId);
    const lbIds = result.lowerBracket.map(t => t.squadId);

    expect(ubIds).toContain('t1');
    expect(ubIds).toContain('t2');
    expect(lbIds).toContain('t3');
    expect(lbIds).toContain('t4');
  });

  it('assigns independent seeds to each bucket', () => {
    const squads = ['t1', 't2', 't3', 't4'].map(makeSquad);
    const squadMap = new Map(squads.map(s => [s.id, s]));

    const matches: TournamentMatch[] = [
      makeMatch('t1', 't2', 't1', 'g1'),
      makeMatch('t1', 't3', 't1', 'g1'),
      makeMatch('t1', 't4', 't1', 'g1'),
      makeMatch('t2', 't3', 't2', 'g1'),
      makeMatch('t2', 't4', 't2', 'g1'),
      makeMatch('t3', 't4', 't3', 'g1'),
    ];

    const result = determineSplitAdvancingTeams(
      [{ label: 'A', matches, squadMap }],
      2, 2, 0,
    );

    expect(result.upperBracket[0].suggestedSeed).toBe(1);
    expect(result.upperBracket[1].suggestedSeed).toBe(2);
    expect(result.lowerBracket[0].suggestedSeed).toBe(1);
    expect(result.lowerBracket[1].suggestedSeed).toBe(2);
  });
});
