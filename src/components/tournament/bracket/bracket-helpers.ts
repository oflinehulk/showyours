import type { TournamentMatch } from '@/lib/tournament-types';

export function isByeMatch(match: TournamentMatch): boolean {
  // A real bye is a match that was auto-completed with only one team
  // (from bracket padding). Pending matches with one empty slot are
  // just waiting for advancement — NOT byes.
  return (
    match.status === 'completed' &&
    (!match.squad_a_id || !match.squad_b_id)
  );
}

export interface GlobalMatchInfo {
  globalNumber: number;
}

export function buildGlobalMatchMap(
  winners: TournamentMatch[],
  losers: TournamentMatch[],
  semis: TournamentMatch[],
  finals: TournamentMatch[]
): Map<string, GlobalMatchInfo> {
  const map = new Map<string, GlobalMatchInfo>();
  let num = 1;

  const sortedWB = [...winners].sort((a, b) => a.round - b.round || a.match_number - b.match_number);
  for (const m of sortedWB) {
    if (isByeMatch(m)) continue;
    map.set(m.id, { globalNumber: num++ });
  }

  const sortedLB = [...losers].sort((a, b) => a.round - b.round || a.match_number - b.match_number);
  for (const m of sortedLB) {
    if (isByeMatch(m)) continue;
    map.set(m.id, { globalNumber: num++ });
  }

  for (const m of semis) { map.set(m.id, { globalNumber: num++ }); }
  for (const m of finals) { map.set(m.id, { globalNumber: num++ }); }

  return map;
}

export function getWBRoundLabel(round: number, totalRounds: number): string {
  if (totalRounds <= 1) return 'Final';
  if (round === totalRounds) return 'UB Final';
  if (round === totalRounds - 1) return 'UB Semi-Final';
  if (round === totalRounds - 2 && totalRounds >= 3) return 'UB Quarter-Final';
  return `UB Round ${round}`;
}

export function getLBRoundLabel(round: number, totalLBRounds: number): string {
  if (round === totalLBRounds) return 'LB Final';
  if (round === totalLBRounds - 1) return 'LB Semi-Final';
  return `LB Round ${round}`;
}
