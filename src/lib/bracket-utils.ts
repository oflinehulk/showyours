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
  squadIds: (string | null)[],
  opts?: StageOptions
): MatchInsert[] {
  if (squadIds.filter(Boolean).length < 2) {
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
  squadIds: (string | null)[],
  opts?: StageOptions
): MatchInsert[] {
  if (squadIds.filter(Boolean).length < 2) {
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

  // Separate regular matches from tiebreaker matches (round 99)
  const regularMatches = matches.filter(m => m.round !== 99);
  const tiebreakerMatches = matches.filter(m => m.round === 99);

  // Process completed regular matches only
  for (const m of regularMatches) {
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

  // Sort with proper multi-way tiebreaker, passing tiebreaker matches as final fallback
  return resolveStandingsWithTiebreaker(standings, regularMatches, tiebreakerMatches);
}

/**
 * Properly resolves standings using multi-way tiebreaker rules:
 * 1. Points (3 per win)
 * 2. Mini H2H table among tied teams (wins within the tied subset)
 * 3. Game difference among tied teams
 * 4. Overall game difference
 * 5. Overall games won
 *
 * For 3+ way ties, we build a mini-table of only matches between
 * the tied teams, then recursively resolve sub-ties.
 */
function resolveStandingsWithTiebreaker(
  standings: GroupStanding[],
  matches: TournamentMatch[],
  tiebreakerMatches: TournamentMatch[] = []
): GroupStanding[] {
  // Group teams by points
  const pointGroups = new Map<number, GroupStanding[]>();
  for (const s of standings) {
    const group = pointGroups.get(s.points) || [];
    group.push(s);
    pointGroups.set(s.points, group);
  }

  // Process each points-tier, highest first
  const sortedPoints = [...pointGroups.keys()].sort((a, b) => b - a);
  const result: GroupStanding[] = [];

  for (const pts of sortedPoints) {
    const tied = pointGroups.get(pts)!;
    if (tied.length === 1) {
      result.push(tied[0]);
    } else {
      // Resolve this group of tied teams
      const resolved = resolveTiedGroup(tied, matches, tiebreakerMatches);
      result.push(...resolved);
    }
  }

  return result;
}

/**
 * Resolves a group of teams that are tied on points.
 * Builds a mini H2H table among just these teams, then sorts by:
 * 1. Mini H2H wins (within this subset)
 * 2. Mini H2H game difference
 * 3. Mini H2H games won
 * 4. Overall game difference
 * 5. Overall games won
 * If still tied after all criteria, recursively resolves sub-ties.
 */
function resolveTiedGroup(
  tiedTeams: GroupStanding[],
  allMatches: TournamentMatch[],
  tiebreakerMatches: TournamentMatch[] = []
): GroupStanding[] {
  if (tiedTeams.length <= 1) return tiedTeams;

  const tiedIds = new Set(tiedTeams.map(t => t.squad_id));

  // Build mini H2H stats among only the tied teams
  const miniStats = new Map<string, { wins: number; scoreFor: number; scoreAgainst: number }>();
  for (const t of tiedTeams) {
    miniStats.set(t.squad_id, { wins: 0, scoreFor: 0, scoreAgainst: 0 });
  }

  for (const m of allMatches) {
    if (m.status !== 'completed' || !m.squad_a_id || !m.squad_b_id) continue;
    if (!tiedIds.has(m.squad_a_id) || !tiedIds.has(m.squad_b_id)) continue;

    const a = miniStats.get(m.squad_a_id)!;
    const b = miniStats.get(m.squad_b_id)!;
    a.scoreFor += m.squad_a_score ?? 0;
    a.scoreAgainst += m.squad_b_score ?? 0;
    b.scoreFor += m.squad_b_score ?? 0;
    b.scoreAgainst += m.squad_a_score ?? 0;
    if (m.winner_id === m.squad_a_id) a.wins++;
    else if (m.winner_id === m.squad_b_id) b.wins++;
  }

  // Score each team
  type ScoredTeam = GroupStanding & {
    miniWins: number;
    miniDiff: number;
    miniFor: number;
    overallDiff: number;
  };

  const scored: ScoredTeam[] = tiedTeams.map(t => {
    const ms = miniStats.get(t.squad_id)!;
    return {
      ...t,
      miniWins: ms.wins,
      miniDiff: ms.scoreFor - ms.scoreAgainst,
      miniFor: ms.scoreFor,
      overallDiff: t.score_for - t.score_against,
    };
  });

  // Sort by mini H2H criteria, then overall
  scored.sort((a, b) => {
    if (b.miniWins !== a.miniWins) return b.miniWins - a.miniWins;
    if (b.miniDiff !== a.miniDiff) return b.miniDiff - a.miniDiff;
    if (b.miniFor !== a.miniFor) return b.miniFor - a.miniFor;
    if (b.overallDiff !== a.overallDiff) return b.overallDiff - a.overallDiff;
    return b.score_for - a.score_for;
  });

  // Check for sub-ties: group teams that are still identical on all criteria
  const result: GroupStanding[] = [];
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (
      j < scored.length &&
      scored[j].miniWins === scored[i].miniWins &&
      scored[j].miniDiff === scored[i].miniDiff &&
      scored[j].miniFor === scored[i].miniFor &&
      scored[j].overallDiff === scored[i].overallDiff &&
      scored[j].score_for === scored[i].score_for
    ) {
      j++;
    }

    if (j - i === 1) {
      // No sub-tie, just push
      result.push(scored[i]);
    } else {
      // Sub-tie remains — try tiebreaker matches (round 99) as final criterion
      const subGroup = scored.slice(i, j) as GroupStanding[];
      const resolved = resolveTiedGroupByTiebreakerMatches(subGroup, tiebreakerMatches);
      result.push(...resolved);
    }
    i = j;
  }

  return result;
}

/**
 * Uses completed tiebreaker matches (round 99) to resolve a deadlocked sub-group.
 * For 3-way ties with 2 tiebreaker matches:
 *   Match 1: A vs B → Winner W1
 *   Match 2: W1 vs C → Winner W2
 *   Rank 1 = W2 (won the final), Rank 3 = Loser of Match 2, Rank 2 = other
 */
function resolveTiedGroupByTiebreakerMatches(
  tiedTeams: GroupStanding[],
  tiebreakerMatches: TournamentMatch[]
): GroupStanding[] {
  if (tiebreakerMatches.length === 0) return tiedTeams;

  const tiedIds = new Set(tiedTeams.map(t => t.squad_id));

  // Collect completed tiebreaker matches involving these teams
  const relevantTBs = tiebreakerMatches.filter(
    m => m.status === 'completed' && m.squad_a_id && m.squad_b_id &&
      tiedIds.has(m.squad_a_id) && tiedIds.has(m.squad_b_id)
  );

  if (relevantTBs.length === 0) return tiedTeams;

  // Build tiebreaker H2H stats
  const tbStats = new Map<string, { wins: number; losses: number; scoreFor: number; scoreAgainst: number }>();
  for (const t of tiedTeams) {
    tbStats.set(t.squad_id, { wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 });
  }

  for (const m of relevantTBs) {
    const a = tbStats.get(m.squad_a_id!)!;
    const b = tbStats.get(m.squad_b_id!)!;
    a.scoreFor += m.squad_a_score ?? 0;
    a.scoreAgainst += m.squad_b_score ?? 0;
    b.scoreFor += m.squad_b_score ?? 0;
    b.scoreAgainst += m.squad_a_score ?? 0;
    if (m.winner_id === m.squad_a_id) { a.wins++; b.losses++; }
    else if (m.winner_id === m.squad_b_id) { b.wins++; a.losses++; }
  }

  // Sort by: tiebreaker wins desc, then tiebreaker game diff, then tiebreaker losses asc
  const sorted = [...tiedTeams].sort((a, b) => {
    const sa = tbStats.get(a.squad_id)!;
    const sb = tbStats.get(b.squad_id)!;
    if (sb.wins !== sa.wins) return sb.wins - sa.wins;
    const diffA = sa.scoreFor - sa.scoreAgainst;
    const diffB = sb.scoreFor - sb.scoreAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (sa.losses !== sb.losses) return sa.losses - sb.losses;
    return 0;
  });

  return sorted;
}

/**
 * Detects teams that are in a perfect deadlock after all tiebreakers are exhausted.
 * Excludes tiebreaker matches (round 99) from analysis, but checks if completed
 * tiebreaker matches already resolve the deadlock.
 * Returns arrays of squad_ids that are still tied (groups of 2+ teams).
 */
export function detectDeadlockedTeams(
  standings: GroupStanding[],
  matches: TournamentMatch[]
): string[][] {
  // Exclude tiebreaker matches from deadlock detection
  const regularMatches = matches.filter(m => m.round !== 99);
  const tiebreakerMatches = matches.filter(m => m.round === 99);

  // Group teams by points (from standings which already exclude round 99)
  const pointGroups = new Map<number, GroupStanding[]>();
  for (const s of standings) {
    const group = pointGroups.get(s.points) || [];
    group.push(s);
    pointGroups.set(s.points, group);
  }

  const deadlocks: string[][] = [];

  for (const [, tied] of pointGroups) {
    if (tied.length < 2) continue;

    // Build mini H2H stats from regular matches only
    const tiedIds = new Set(tied.map(t => t.squad_id));
    const miniStats = new Map<string, { wins: number; scoreFor: number; scoreAgainst: number }>();
    for (const t of tied) {
      miniStats.set(t.squad_id, { wins: 0, scoreFor: 0, scoreAgainst: 0 });
    }

    for (const m of regularMatches) {
      if (m.status !== 'completed' || !m.squad_a_id || !m.squad_b_id) continue;
      if (!tiedIds.has(m.squad_a_id) || !tiedIds.has(m.squad_b_id)) continue;
      const a = miniStats.get(m.squad_a_id)!;
      const b = miniStats.get(m.squad_b_id)!;
      a.scoreFor += m.squad_a_score ?? 0;
      a.scoreAgainst += m.squad_b_score ?? 0;
      b.scoreFor += m.squad_b_score ?? 0;
      b.scoreAgainst += m.squad_a_score ?? 0;
      if (m.winner_id === m.squad_a_id) a.wins++;
      else if (m.winner_id === m.squad_b_id) b.wins++;
    }

    // Score each team
    const scored = tied.map(t => {
      const ms = miniStats.get(t.squad_id)!;
      return {
        squadId: t.squad_id,
        miniWins: ms.wins,
        miniDiff: ms.scoreFor - ms.scoreAgainst,
        miniFor: ms.scoreFor,
        overallDiff: t.score_for - t.score_against,
        overallFor: t.score_for,
      };
    });

    // Find sub-groups that are identical on all criteria
    scored.sort((a, b) => {
      if (b.miniWins !== a.miniWins) return b.miniWins - a.miniWins;
      if (b.miniDiff !== a.miniDiff) return b.miniDiff - a.miniDiff;
      if (b.miniFor !== a.miniFor) return b.miniFor - a.miniFor;
      if (b.overallDiff !== a.overallDiff) return b.overallDiff - a.overallDiff;
      return b.overallFor - a.overallFor;
    });

    let i = 0;
    while (i < scored.length) {
      let j = i + 1;
      while (
        j < scored.length &&
        scored[j].miniWins === scored[i].miniWins &&
        scored[j].miniDiff === scored[i].miniDiff &&
        scored[j].miniFor === scored[i].miniFor &&
        scored[j].overallDiff === scored[i].overallDiff &&
        scored[j].overallFor === scored[i].overallFor
      ) {
        j++;
      }
      if (j - i >= 2) {
        const deadlockedIds = scored.slice(i, j).map(s => s.squadId);
        
        // Check if completed tiebreaker matches fully resolve this deadlock
        if (!isTiebreakerFullyResolved(deadlockedIds, tiebreakerMatches)) {
          deadlocks.push(deadlockedIds);
        }
      }
      i = j;
    }
  }

  return deadlocks;
}

/**
 * Checks if tiebreaker matches fully resolve a deadlock.
 * For a 3-way tie, needs 2 completed tiebreaker matches.
 * For a 2-way tie, needs 1 completed tiebreaker match.
 */
function isTiebreakerFullyResolved(
  deadlockedIds: string[],
  tiebreakerMatches: TournamentMatch[]
): boolean {
  const idSet = new Set(deadlockedIds);
  
  // Get completed tiebreaker matches involving these teams
  const completedTBs = tiebreakerMatches.filter(
    m => m.status === 'completed' && m.squad_a_id && m.squad_b_id &&
      idSet.has(m.squad_a_id) && idSet.has(m.squad_b_id)
  );

  if (deadlockedIds.length === 2) {
    return completedTBs.length >= 1;
  }

  if (deadlockedIds.length === 3) {
    // Mini round-robin: need 3 completed tiebreaker matches for full resolution
    // Check if all 3 matches resolve to unique rankings
    if (completedTBs.length < 3) return false;
    // Verify the results produce a unique ordering (no sub-tie in tiebreaker RR)
    const tbStats = new Map<string, { wins: number; scoreFor: number; scoreAgainst: number }>();
    for (const id of deadlockedIds) {
      tbStats.set(id, { wins: 0, scoreFor: 0, scoreAgainst: 0 });
    }
    for (const m of completedTBs) {
      const a = tbStats.get(m.squad_a_id!)!;
      const b = tbStats.get(m.squad_b_id!)!;
      a.scoreFor += m.squad_a_score ?? 0;
      a.scoreAgainst += m.squad_b_score ?? 0;
      b.scoreFor += m.squad_b_score ?? 0;
      b.scoreAgainst += m.squad_a_score ?? 0;
      if (m.winner_id === m.squad_a_id) a.wins++;
      else if (m.winner_id === m.squad_b_id) b.wins++;
    }
    // Check unique win counts or game diff
    const vals = [...tbStats.values()];
    const winCounts = vals.map(v => v.wins);
    const uniqueWins = new Set(winCounts);
    if (uniqueWins.size === deadlockedIds.length) return true;
    // Fall back to game diff uniqueness
    const diffs = vals.map(v => v.scoreFor - v.scoreAgainst);
    const uniqueDiffs = new Set(diffs);
    return uniqueDiffs.size === deadlockedIds.length;
  }

  // For 4+ way ties, check if enough matches to create a unique ordering
  // (conservative: need n-1 completed matches)
  return completedTBs.length >= deadlockedIds.length - 1;
}

/**
 * Analyzes the tiebreaker progress for a group of deadlocked teams.
 * Returns info about what step we're on and what match to create next.
 */
export interface TiebreakerProgress {
  totalTeams: number;
  completedMatches: TournamentMatch[];
  pendingMatches: TournamentMatch[];
  /** Step 1 = first match needed, Step 2 = second match needed, etc. */
  currentStep: number;
  totalSteps: number;
  isFullyResolved: boolean;
  /** For 3-way ties: the suggested next match (winner of last match vs remaining team) */
  suggestedNextMatch?: { squadAId: string; squadBId: string };
  /** The team sitting out the current step */
  byeTeamId?: string;
}

export function getTiebreakerProgress(
  deadlockedIds: string[],
  groupMatches: TournamentMatch[]
): TiebreakerProgress {
  const idSet = new Set(deadlockedIds);
  const tiebreakerMatches = groupMatches.filter(m => m.round === 99);
  
  const relevantTBs = tiebreakerMatches.filter(
    m => m.squad_a_id && m.squad_b_id && idSet.has(m.squad_a_id) && idSet.has(m.squad_b_id)
  );
  
  const completedTBs = relevantTBs.filter(m => m.status === 'completed');
  const pendingTBs = relevantTBs.filter(m => m.status !== 'completed');

  // For 3-way ties: mini round-robin needs 3 matches total
  const totalSteps = deadlockedIds.length === 3 ? 3 : deadlockedIds.length - 1;
  const currentStep = completedTBs.length + pendingTBs.length + 1;
  const isFullyResolved = deadlockedIds.length === 3
    ? completedTBs.length >= 3
    : completedTBs.length >= totalSteps;

  const progress: TiebreakerProgress = {
    totalTeams: deadlockedIds.length,
    completedMatches: completedTBs,
    pendingMatches: pendingTBs,
    currentStep: Math.min(currentStep, totalSteps + 1),
    totalSteps,
    isFullyResolved,
  };

  return progress;
}
/** Simple pairwise H2H — kept for backward compatibility */
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
  if (aWins > bWins) return -1;
  if (bWins > aWins) return 1;
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

export type GroupData = { label: string; matches: TournamentMatch[]; squadMap: Map<string, TournamentSquad> };

export function determineAdvancingTeams(
  groups: GroupData[],
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

// ========== Seeded Double Elimination ==========

function nextPow2(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/** Compute the number of initial LB-only rounds before WB dropdowns merge in. */
export function computeLBInitialRounds(ubCount: number, lbCount: number): number {
  if (lbCount === 0) return 0;
  const pUb = nextPow2(ubCount);
  const pLb = nextPow2(lbCount);
  return Math.max(1, Math.round(Math.log2((2 * pLb) / pUb)));
}

export interface SeededDEOptions extends StageOptions {
  semiFinalsBestOf?: 1 | 3 | 5;
}

/**
 * Generate a seeded double-elimination bracket where the Upper Bracket and
 * Lower Bracket start with separate team pools.
 *
 * UB is a standard SE bracket from ubSquadIds.
 * LB starts with its own SE bracket from lbSquadIds, then WB losers merge in.
 * After the main bracket a Semi-Final (UB Final loser vs LB Champion) and
 * Grand Final (UB Final winner vs SF winner) are created.
 *
 * Falls back to standard DE when lbSquadIds is empty.
 */
export function generateSeededDoubleEliminationBracket(
  tournamentId: string,
  ubSquadIds: string[],
  lbSquadIds: string[],
  opts?: SeededDEOptions
): MatchInsert[] {
  // Fallback to standard DE if no LB teams
  if (lbSquadIds.length === 0) {
    return generateDoubleEliminationBracket(tournamentId, ubSquadIds, opts);
  }

  if (ubSquadIds.length < 2) {
    throw new Error('Need at least 2 UB teams to generate a seeded DE bracket');
  }
  if (lbSquadIds.length < 2) {
    throw new Error('Need at least 2 LB teams to generate a seeded DE bracket');
  }

  const bo = opts?.defaultBestOf ?? 3;
  const fbo = opts?.finalsBestOf ?? 5;
  const sfBo = opts?.semiFinalsBestOf ?? fbo;

  const matches: MatchInsert[] = [];

  // --- Pad both pools ---
  const rUb = Math.ceil(Math.log2(ubSquadIds.length));
  const pUb = Math.pow(2, rUb);
  const ubPadded: (string | null)[] = [...ubSquadIds];
  while (ubPadded.length < pUb) ubPadded.push(null);

  const pLb = nextPow2(lbSquadIds.length);
  const lbPadded: (string | null)[] = [...lbSquadIds];
  while (lbPadded.length < pLb) lbPadded.push(null);

  const k = computeLBInitialRounds(ubSquadIds.length, lbSquadIds.length);
  const totalLBRounds = k + 2 * (rUb - 1);

  // ========== Winners Bracket ==========
  // WB R1
  let mn = 1;
  for (let i = 0; i < ubPadded.length; i += 2) {
    matches.push({
      ...baseMatch(tournamentId, opts),
      round: 1,
      match_number: mn,
      bracket_type: 'winners',
      squad_a_id: ubPadded[i] ?? null,
      squad_b_id: ubPadded[i + 1] ?? null,
      best_of: bo,
    } as MatchInsert);
    mn++;
  }

  // WB R2..rUb
  let wbMatchCount = pUb / 4;
  for (let round = 2; round <= rUb; round++) {
    for (let i = 0; i < wbMatchCount; i++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round,
        match_number: i + 1,
        bracket_type: 'winners',
        squad_a_id: null,
        squad_b_id: null,
        best_of: round === rUb ? Math.max(bo, 3) as 1 | 3 | 5 : bo,
      } as MatchInsert);
    }
    wbMatchCount = Math.max(wbMatchCount / 2, 1);
    if (wbMatchCount < 1) break;
  }

  // ========== Losers Bracket ==========

  // --- Initial LB pure rounds (1..k): SE from lbPadded ---
  // LB R1: lbPadded paired up
  mn = 1;
  for (let i = 0; i < lbPadded.length; i += 2) {
    matches.push({
      ...baseMatch(tournamentId, opts),
      round: 1,
      match_number: mn,
      bracket_type: 'losers',
      squad_a_id: lbPadded[i] ?? null,
      squad_b_id: lbPadded[i + 1] ?? null,
      best_of: bo,
    } as MatchInsert);
    mn++;
  }

  // LB R2..k: additional initial pure SE rounds (halving each time)
  for (let r = 2; r <= k; r++) {
    const matchCount = pLb / Math.pow(2, r);
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        ...baseMatch(tournamentId, opts),
        round: r,
        match_number: i + 1,
        bracket_type: 'losers',
        squad_a_id: null,
        squad_b_id: null,
        best_of: bo,
      } as MatchInsert);
    }
  }

  // --- Post-initial alternating rounds (k+1 .. totalLBRounds) ---
  // After k initial rounds, LB survivors = pLb / 2^k = pUb / 2
  // Mixed rounds (odd offset from k): matchCount same as prev pure round
  // Pure rounds (even offset from k): matchCount halves via SE pairing
  let currentLBCount = pLb / Math.pow(2, k); // survivors after initial rounds = pUb / 2

  for (let r = k + 1; r <= totalLBRounds; r++) {
    const offset = r - k;
    const isMixed = offset % 2 === 1;

    if (isMixed) {
      // Mixed round: same matchCount as LB survivors coming in (1:1 with WB dropdown)
      for (let i = 0; i < currentLBCount; i++) {
        matches.push({
          ...baseMatch(tournamentId, opts),
          round: r,
          match_number: i + 1,
          bracket_type: 'losers',
          squad_a_id: null,
          squad_b_id: null,
          best_of: r === totalLBRounds ? Math.max(bo, 3) as 1 | 3 | 5 : bo,
        } as MatchInsert);
      }
      // currentLBCount stays the same after mixed (same number of survivors)
    } else {
      // Pure round: SE pairing halves the count
      currentLBCount = currentLBCount / 2;
      for (let i = 0; i < currentLBCount; i++) {
        matches.push({
          ...baseMatch(tournamentId, opts),
          round: r,
          match_number: i + 1,
          bracket_type: 'losers',
          squad_a_id: null,
          squad_b_id: null,
          best_of: r === totalLBRounds ? Math.max(bo, 3) as 1 | 3 | 5 : bo,
        } as MatchInsert);
      }
    }
  }

  // ========== Semi-Final ==========
  // UB Final loser (slot A) vs LB Champion (slot B)
  matches.push({
    ...baseMatch(tournamentId, opts),
    round: 1,
    match_number: 1,
    bracket_type: 'semi_finals',
    squad_a_id: null,
    squad_b_id: null,
    best_of: sfBo,
  } as MatchInsert);

  // ========== Grand Final ==========
  // UB Final winner (slot A) vs SF winner (slot B)
  matches.push({
    ...baseMatch(tournamentId, opts),
    round: 1,
    match_number: 1,
    bracket_type: 'finals',
    squad_a_id: null,
    squad_b_id: null,
    best_of: fbo,
  } as MatchInsert);

  return matches;
}

// ========== Split Group Advancement ==========

export interface SplitAdvancementResult {
  upperBracket: AdvancingTeam[];
  lowerBracket: AdvancingTeam[];
}

/**
 * Split group standings into separate UB and LB pools.
 * Bottom `advanceToLowerPerGroup` from each group -> LB.
 * Everyone above them -> UB (variable per group size).
 * `advanceBestRemaining` from remaining -> LB.
 *
 * `advancePerGroup` is used as the *minimum* UB count (for groups at the
 * expected size).  For larger groups the UB count grows automatically:
 *   upperCount = max(advancePerGroup, groupSize - advanceToLowerPerGroup)
 * This means groups of 4 send 2 to UB and groups of 5 send 3 to UB when
 * advancePerGroup=2 and advanceToLowerPerGroup=2.
 */
export function determineSplitAdvancingTeams(
  groups: GroupData[],
  advancePerGroup: number,
  advanceToLowerPerGroup: number,
  advanceBestRemaining: number
): SplitAdvancementResult {
  const ub: AdvancingTeam[] = [];
  const lb: AdvancingTeam[] = [];
  const remainingCandidates: (GroupStanding & { groupLabel: string })[] = [];

  for (const group of groups) {
    const standings = computeGroupStandings(group.matches, group.squadMap);

    // Variable advancement: bottom N always go to LB, everyone else to UB.
    // For equal-sized groups this matches the configured advancePerGroup.
    // For larger groups (e.g. 5 instead of 4), extra teams go to UB.
    const upperCount = Math.max(advancePerGroup, standings.length - advanceToLowerPerGroup);

    for (let i = 0; i < standings.length; i++) {
      const team: AdvancingTeam = {
        squadId: standings[i].squad_id,
        squad: standings[i].squad,
        groupLabel: group.label,
        groupRank: i + 1,
        points: standings[i].points,
        suggestedSeed: 0,
      };

      if (i < upperCount) {
        ub.push(team);
      } else if (i < upperCount + advanceToLowerPerGroup) {
        lb.push(team);
      } else if (advanceBestRemaining > 0) {
        remainingCandidates.push({ ...standings[i], groupLabel: group.label });
      }
    }
  }

  // Sort remaining candidates for "best remaining" -> LB
  remainingCandidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.score_for - a.score_against;
    const diffB = b.score_for - b.score_against;
    if (diffB !== diffA) return diffB - diffA;
    return b.score_for - a.score_for;
  });

  for (let i = 0; i < Math.min(advanceBestRemaining, remainingCandidates.length); i++) {
    const c = remainingCandidates[i];
    lb.push({
      squadId: c.squad_id,
      squad: c.squad,
      groupLabel: c.groupLabel,
      groupRank: advancePerGroup + advanceToLowerPerGroup + 1,
      points: c.points,
      suggestedSeed: 0,
    });
  }

  // Seed each bucket independently
  const seedBucket = (bucket: AdvancingTeam[]) => {
    bucket.sort((a, b) => {
      if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
      return b.points - a.points;
    });
    for (let i = 0; i < bucket.length; i++) {
      bucket[i].suggestedSeed = i + 1;
    }
  };

  seedBucket(ub);
  seedBucket(lb);

  return { upperBracket: ub, lowerBracket: lb };
}
