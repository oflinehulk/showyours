import type { TournamentMatch, TournamentSquad, GroupStanding } from '@/lib/tournament-types';

type MatchInsert = Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b' | 'squad_a_checked_in' | 'squad_b_checked_in' | 'is_forfeit' | 'dispute_reason' | 'dispute_screenshot' | 'dispute_raised_by' | 'dispute_resolved_by' | 'dispute_resolution_notes'>;

interface StageOptions {
  stageId?: string;
  groupId?: string;
  defaultBestOf?: 1 | 3 | 5;
  finalsBestOf?: 1 | 3 | 5;
}

function baseMatch(tournamentId: string, opts?: StageOptions): Partial<MatchInsert> {
  return {
    tournament_id: tournamentId,
    stage_id: opts?.stageId ?? null,
    group_id: opts?.groupId ?? null,
    winner_id: null,
    status: 'pending',
    squad_a_score: 0,
    squad_b_score: 0,
    result_screenshot: null,
    scheduled_time: null,
    completed_at: null,
  };
}

export function generateSingleEliminationBracket(
  tournamentId: string,
  squadIds: string[],
  opts?: StageOptions
): MatchInsert[] {
  if (squadIds.length < 2) {
    throw new Error('Need at least 2 teams to generate a bracket');
  }
  const matches: MatchInsert[] = [];
  const totalRounds = Math.ceil(Math.log2(squadIds.length));
  const bo = opts?.defaultBestOf ?? 1;
  const fbo = opts?.finalsBestOf ?? 5;

  // Pad to power of 2
  const paddedLength = Math.pow(2, totalRounds);
  const padded: (string | null)[] = [...squadIds];
  while (padded.length < paddedLength) {
    padded.push(null);
  }

  // First round matches
  let matchNumber = 1;
  for (let i = 0; i < padded.length; i += 2) {
    matches.push({
      ...baseMatch(tournamentId, opts),
      round: 1,
      match_number: matchNumber,
      bracket_type: 'winners',
      squad_a_id: padded[i] ?? null,
      squad_b_id: padded[i + 1] ?? null,
      best_of: bo,
    } as MatchInsert);
    matchNumber++;
  }

  // Subsequent rounds
  let matchesInRound = paddedLength / 4;
  for (let round = 2; round <= totalRounds; round++) {
    const isFinal = round === totalRounds;
    const isSemiFinal = round === totalRounds - 1;

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round,
        match_number: i + 1,
        bracket_type: isFinal ? 'finals' : 'winners',
        squad_a_id: null,
        squad_b_id: null,
        best_of: isFinal ? fbo : (isSemiFinal && bo < 3 ? 3 : bo),
      } as MatchInsert);
    }
    matchesInRound = matchesInRound / 2;
  }

  return matches;
}

export function generateDoubleEliminationBracket(
  tournamentId: string,
  squadIds: string[],
  opts?: StageOptions
): MatchInsert[] {
  if (squadIds.length < 2) {
    throw new Error('Need at least 2 teams to generate a bracket');
  }
  const totalRounds = Math.ceil(Math.log2(squadIds.length));
  const paddedLength = Math.pow(2, totalRounds);
  const padded: (string | null)[] = [...squadIds];
  while (padded.length < paddedLength) {
    padded.push(null);
  }

  const bo = opts?.defaultBestOf ?? 1;
  const fbo = opts?.finalsBestOf ?? 5;
  const matches: MatchInsert[] = [];

  // Winners bracket
  let matchNumber = 1;
  for (let i = 0; i < padded.length; i += 2) {
    matches.push({
      ...baseMatch(tournamentId, opts),
      round: 1,
      match_number: matchNumber,
      bracket_type: 'winners',
      squad_a_id: padded[i] ?? null,
      squad_b_id: padded[i + 1] ?? null,
      best_of: bo,
    } as MatchInsert);
    matchNumber++;
  }

  let matchesInRound = paddedLength / 4;
  for (let round = 2; round <= totalRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round,
        match_number: i + 1,
        bracket_type: 'winners',
        squad_a_id: null,
        squad_b_id: null,
        best_of: round === totalRounds ? (bo < 3 ? 3 : bo) : bo,
      } as MatchInsert);
    }
    matchesInRound = Math.max(matchesInRound / 2, 1);
    if (matchesInRound < 1) break;
  }

  // Losers bracket: 2*(totalRounds-1) rounds
  // Odd rounds = "pure LB" (only LB survivors play each other)
  // Even rounds = "mixed" (LB survivors vs WB dropdowns)
  const totalLBRounds = 2 * (totalRounds - 1);

  for (let lbRound = 1; lbRound <= totalLBRounds; lbRound++) {
    // Pair index: rounds (1,2) share count, (3,4) share count, etc.
    const pairIndex = Math.floor((lbRound - 1) / 2);
    const matchCount = Math.max(paddedLength / Math.pow(2, pairIndex + 2), 1);

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round: lbRound,
        match_number: i + 1,
        bracket_type: 'losers',
        squad_a_id: null,
        squad_b_id: null,
        best_of: lbRound === totalLBRounds ? Math.max(bo, 3) : bo,
      } as MatchInsert);
    }
  }

  // Grand Finals
  matches.push({
    ...baseMatch(tournamentId, opts),
    round: totalRounds + 1,
    match_number: 1,
    bracket_type: 'finals',
    squad_a_id: null,
    squad_b_id: null,
    best_of: fbo,
  } as MatchInsert);

  return matches;
}

export function generateRoundRobinBracket(
  tournamentId: string,
  squadIds: string[],
  opts?: StageOptions
): MatchInsert[] {
  if (squadIds.length < 2) {
    throw new Error('Need at least 2 teams to generate a bracket');
  }
  const matches: MatchInsert[] = [];
  const bo = opts?.defaultBestOf ?? 1;

  let matchNumber = 1;
  for (let i = 0; i < squadIds.length; i++) {
    for (let j = i + 1; j < squadIds.length; j++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round: 1,
        match_number: matchNumber,
        bracket_type: 'winners',
        squad_a_id: squadIds[i],
        squad_b_id: squadIds[j],
        best_of: bo,
      } as MatchInsert);
      matchNumber++;
    }
  }

  return matches;
}

// ========== Group Standings Utilities ==========

export function computeGroupStandings(
  matches: TournamentMatch[],
  squadMap: Map<string, TournamentSquad>
): GroupStanding[] {
  const stats = new Map<string, {
    played: number; wins: number; losses: number;
    score_for: number; score_against: number;
  }>();

  // Initialize all squads in the map
  for (const [squadId] of squadMap) {
    stats.set(squadId, { played: 0, wins: 0, losses: 0, score_for: 0, score_against: 0 });
  }

  // Process completed matches
  for (const m of matches) {
    if (m.status !== 'completed' || !m.squad_a_id || !m.squad_b_id) continue;

    const a = stats.get(m.squad_a_id);
    const b = stats.get(m.squad_b_id);
    if (!a || !b) continue;

    a.played++;
    b.played++;
    a.score_for += m.squad_a_score;
    a.score_against += m.squad_b_score;
    b.score_for += m.squad_b_score;
    b.score_against += m.squad_a_score;

    if (m.winner_id === m.squad_a_id) {
      a.wins++;
      b.losses++;
    } else if (m.winner_id === m.squad_b_id) {
      b.wins++;
      a.losses++;
    }
  }

  // Build standings
  const standings: GroupStanding[] = [];
  for (const [squadId, s] of stats) {
    const squad = squadMap.get(squadId);
    if (!squad) continue;
    standings.push({
      squad_id: squadId,
      squad,
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      score_for: s.score_for,
      score_against: s.score_against,
      points: s.wins * 3,
    });
  }

  // Sort: points desc, then H2H, then score diff, then score for
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Head-to-head
    const h2h = getH2HResult(matches, a.squad_id, b.squad_id);
    if (h2h !== 0) return h2h;
    // Score difference
    const diffA = a.score_for - a.score_against;
    const diffB = b.score_for - b.score_against;
    if (diffB !== diffA) return diffB - diffA;
    // Score for
    return b.score_for - a.score_for;
  });

  return standings;
}

function getH2HResult(matches: TournamentMatch[], squadA: string, squadB: string): number {
  let aWins = 0;
  let bWins = 0;
  for (const m of matches) {
    if (m.status !== 'completed') continue;
    if (
      (m.squad_a_id === squadA && m.squad_b_id === squadB) ||
      (m.squad_a_id === squadB && m.squad_b_id === squadA)
    ) {
      if (m.winner_id === squadA) aWins++;
      else if (m.winner_id === squadB) bWins++;
    }
  }
  if (aWins > bWins) return -1; // A wins H2H, sort A higher
  if (bWins > aWins) return 1;  // B wins H2H, sort B higher
  return 0;
}

export interface AdvancingTeam {
  squadId: string;
  squad: TournamentSquad;
  groupLabel: string;
  groupRank: number;
  points: number;
  suggestedSeed: number;
}

export function determineAdvancingTeams(
  groups: { label: string; matches: TournamentMatch[]; squadMap: Map<string, TournamentSquad> }[],
  advancePerGroup: number,
  advanceBestRemaining: number
): AdvancingTeam[] {
  const advancing: AdvancingTeam[] = [];
  const remainingCandidates: (GroupStanding & { groupLabel: string })[] = [];

  // Collect top N from each group
  for (const group of groups) {
    const standings = computeGroupStandings(group.matches, group.squadMap);

    for (let i = 0; i < standings.length; i++) {
      if (i < advancePerGroup) {
        advancing.push({
          squadId: standings[i].squad_id,
          squad: standings[i].squad,
          groupLabel: group.label,
          groupRank: i + 1,
          points: standings[i].points,
          suggestedSeed: 0, // filled below
        });
      } else if (i >= advancePerGroup && advanceBestRemaining > 0) {
        // Candidate for "best remaining"
        remainingCandidates.push({ ...standings[i], groupLabel: group.label });
      }
    }
  }

  // Sort remaining candidates by points desc, then tiebreakers
  remainingCandidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.score_for - a.score_against;
    const diffB = b.score_for - b.score_against;
    if (diffB !== diffA) return diffB - diffA;
    return b.score_for - a.score_for;
  });

  // Add best remaining
  for (let i = 0; i < Math.min(advanceBestRemaining, remainingCandidates.length); i++) {
    const c = remainingCandidates[i];
    advancing.push({
      squadId: c.squad_id,
      squad: c.squad,
      groupLabel: c.groupLabel,
      groupRank: advancePerGroup + 1,
      points: c.points,
      suggestedSeed: 0,
    });
  }

  // Assign suggested seeds: group winners first (by points), then runners-up, then best remaining
  advancing.sort((a, b) => {
    if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
    return b.points - a.points;
  });

  for (let i = 0; i < advancing.length; i++) {
    advancing[i].suggestedSeed = i + 1;
  }

  return advancing;
}
