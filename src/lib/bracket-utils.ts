import type { TournamentMatch } from '@/lib/tournament-types';

type MatchInsert = Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b' | 'squad_a_checked_in' | 'squad_b_checked_in' | 'is_forfeit' | 'dispute_reason' | 'dispute_screenshot' | 'dispute_raised_by' | 'dispute_resolved_by' | 'dispute_resolution_notes'>;

export function generateSingleEliminationBracket(
  tournamentId: string,
  squadIds: string[]
): MatchInsert[] {
  const matches: MatchInsert[] = [];
  const totalRounds = Math.ceil(Math.log2(squadIds.length));

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
      tournament_id: tournamentId,
      round: 1,
      match_number: matchNumber,
      bracket_type: 'winners',
      squad_a_id: padded[i] || null,
      squad_b_id: padded[i + 1] || null,
      winner_id: null,
      status: 'pending',
      best_of: 1,
      squad_a_score: 0,
      squad_b_score: 0,
      result_screenshot: null,
      scheduled_time: null,
      completed_at: null,
    });
    matchNumber++;
  }

  // Subsequent rounds (empty matches to be filled as winners advance)
  let matchesInRound = paddedLength / 4;
  for (let round = 2; round <= totalRounds; round++) {
    const isFinal = round === totalRounds;
    const isSemiFinal = round === totalRounds - 1;

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        match_number: i + 1,
        bracket_type: isFinal ? 'finals' : 'winners',
        squad_a_id: null,
        squad_b_id: null,
        winner_id: null,
        status: 'pending',
        best_of: isFinal ? 5 : (isSemiFinal ? 3 : 1),
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  return matches;
}

export function generateDoubleEliminationBracket(
  tournamentId: string,
  squadIds: string[]
): MatchInsert[] {
  const totalRounds = Math.ceil(Math.log2(squadIds.length));
  const paddedLength = Math.pow(2, totalRounds);
  const padded: (string | null)[] = [...squadIds];
  while (padded.length < paddedLength) {
    padded.push(null);
  }

  const matches: MatchInsert[] = [];

  // Winners bracket
  let matchNumber = 1;
  for (let i = 0; i < padded.length; i += 2) {
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: matchNumber,
      bracket_type: 'winners',
      squad_a_id: padded[i] || null,
      squad_b_id: padded[i + 1] || null,
      winner_id: null,
      status: 'pending',
      best_of: 1,
      squad_a_score: 0,
      squad_b_score: 0,
      result_screenshot: null,
      scheduled_time: null,
      completed_at: null,
    });
    matchNumber++;
  }

  let matchesInRound = paddedLength / 4;
  for (let round = 2; round <= totalRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        match_number: i + 1,
        bracket_type: 'winners',
        squad_a_id: null,
        squad_b_id: null,
        winner_id: null,
        status: 'pending',
        best_of: round === totalRounds ? 3 : 1,
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
    }
    matchesInRound = Math.max(matchesInRound / 2, 1);
    if (matchesInRound < 1) break;
  }

  // Losers bracket
  let loserMatchNumber = 1;
  for (let round = 1; round < totalRounds; round++) {
    const loserMatchesInRound = Math.max(Math.pow(2, totalRounds - round - 1), 1);
    for (let i = 0; i < loserMatchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        match_number: loserMatchNumber,
        bracket_type: 'losers',
        squad_a_id: null,
        squad_b_id: null,
        winner_id: null,
        status: 'pending',
        best_of: 1,
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
      loserMatchNumber++;
    }
  }

  // Grand Finals
  matches.push({
    tournament_id: tournamentId,
    round: totalRounds + 1,
    match_number: 1,
    bracket_type: 'finals',
    squad_a_id: null,
    squad_b_id: null,
    winner_id: null,
    status: 'pending',
    best_of: 5,
    squad_a_score: 0,
    squad_b_score: 0,
    result_screenshot: null,
    scheduled_time: null,
    completed_at: null,
  });

  return matches;
}

export function generateRoundRobinBracket(
  tournamentId: string,
  squadIds: string[]
): MatchInsert[] {
  const matches: MatchInsert[] = [];

  let matchNumber = 1;
  for (let i = 0; i < squadIds.length; i++) {
    for (let j = i + 1; j < squadIds.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNumber,
        bracket_type: 'winners',
        squad_a_id: squadIds[i],
        squad_b_id: squadIds[j],
        winner_id: null,
        status: 'pending',
        best_of: 1,
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
      matchNumber++;
    }
  }

  return matches;
}
