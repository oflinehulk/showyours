import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch, MatchStatus } from '@/lib/tournament-types';

// Helper: find a match by criteria
export async function findNextMatch(
  tournamentId: string,
  round: number,
  matchNumber: number,
  bracketTypes: string[],
  stageId?: string | null
) {
  let query = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', round)
    .eq('match_number', matchNumber)
    .in('bracket_type', bracketTypes);

  if (stageId) {
    query = query.eq('stage_id', stageId);
  }

  const { data, error: queryError } = await query;
  if (queryError) throw new Error(queryError.message);
  return data && data.length > 0 ? data[0] : null;
}

// Helper: find the Grand Finals match
export async function findGrandFinals(
  tournamentId: string,
  stageId?: string | null
) {
  let query = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('bracket_type', 'finals')
    .eq('match_number', 1);

  if (stageId) {
    query = query.eq('stage_id', stageId);
  }

  const { data, error: queryError } = await query;
  if (queryError) throw new Error(queryError.message);
  return data && data.length > 0 ? data[0] : null;
}

// Helper: find the Semi-Finals match (seeded DE)
export async function findSemiFinals(
  tournamentId: string,
  stageId?: string | null
) {
  let query = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('bracket_type', 'semi_finals')
    .eq('match_number', 1);

  if (stageId) {
    query = query.eq('stage_id', stageId);
  }

  const { data, error: queryError } = await query;
  if (queryError) throw new Error(queryError.message);
  return data && data.length > 0 ? data[0] : null;
}

// Helper: fetch lb_initial_rounds (k) for a stage (0 = standard DE)
export async function fetchStageK(stageId: string | null | undefined): Promise<number> {
  if (!stageId) return 0;
  const { data, error } = await supabase
    .from('tournament_stages')
    .select('lb_initial_rounds')
    .eq('id', stageId)
    .maybeSingle();
  if (error || !data) return 0;
  return (data as { lb_initial_rounds?: number }).lb_initial_rounds ?? 0;
}

// ========== Cascading Reset ==========
// Resets a match AND recursively resets all downstream matches that depend on it.
// This is the only safe way to reset a match mid-tournament.

async function resetSingleMatch(matchId: string) {
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      status: 'pending' as MatchStatus,
      winner_id: null,
      squad_a_score: 0,
      squad_b_score: 0,
      completed_at: null,
      is_forfeit: false,
      squad_a_checked_in: false,
      squad_b_checked_in: false,
      toss_winner: null,
      blue_side_team: null,
      red_side_team: null,
      toss_completed_at: null,
    })
    .eq('id', matchId);
  if (error) throw new Error(`resetSingleMatch failed: ${error.message}`);
}

// Find the downstream match data that a given match's winner was advanced into.
// Returns { match, slot } or null.
async function findDownstreamWinnerTarget(
  tournamentId: string,
  match: TournamentMatch,
  k: number,
): Promise<{ match: TournamentMatch; slot: string } | null> {
  const { bracket_type, round, match_number, winner_id, stage_id } = match;
  if (!winner_id) return null;

  if (bracket_type === 'winners') {
    const nextRound = round + 1;
    const nextMN = Math.ceil(match_number / 2);
    const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
    const next = await findNextMatch(tournamentId, nextRound, nextMN, ['winners', 'finals'], stage_id);
    if (next && (next as Record<string, unknown>)[slot] === winner_id) {
      return { match: next as unknown as TournamentMatch, slot };
    }
    // WB Final fallback: check if winner went to GF slot A
    const gf = await findGrandFinals(tournamentId, stage_id);
    if (gf && gf.squad_a_id === winner_id) {
      return { match: gf as unknown as TournamentMatch, slot: 'squad_a_id' };
    }
    return null;
  }

  if (bracket_type === 'semi_finals') {
    const gf = await findGrandFinals(tournamentId, stage_id);
    if (gf && gf.squad_b_id === winner_id) {
      return { match: gf as unknown as TournamentMatch, slot: 'squad_b_id' };
    }
    return null;
  }

  if (bracket_type === 'losers') {
    if (k > 0) {
      const offset = round - k;
      if (round < k) {
        const nextMN = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
        const next = await findNextMatch(tournamentId, round + 1, nextMN, ['losers'], stage_id);
        if (next && (next as Record<string, unknown>)[slot] === winner_id) {
          return { match: next as unknown as TournamentMatch, slot };
        }
      } else if (round === k || offset % 2 === 0) {
        // round===k: passthrough to first mixed round
        // even offset (pure round): passthrough to next mixed round (same count)
        const next = await findNextMatch(tournamentId, round + 1, match_number, ['losers'], stage_id);
        if (next && next.squad_a_id === winner_id) {
          return { match: next as unknown as TournamentMatch, slot: 'squad_a_id' };
        }
        // LB champion fallback: check SF then GF
        const sf = await findSemiFinals(tournamentId, stage_id);
        if (sf && sf.squad_b_id === winner_id) {
          return { match: sf as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
        const gf2 = await findGrandFinals(tournamentId, stage_id);
        if (gf2 && gf2.squad_b_id === winner_id) {
          return { match: gf2 as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
      } else {
        // odd offset (mixed round): halving to next pure round (half count)
        const nextMN = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
        const next = await findNextMatch(tournamentId, round + 1, nextMN, ['losers'], stage_id);
        if (next && (next as Record<string, unknown>)[slot] === winner_id) {
          return { match: next as unknown as TournamentMatch, slot };
        }
        const sf = await findSemiFinals(tournamentId, stage_id);
        if (sf && sf.squad_b_id === winner_id) {
          return { match: sf as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
        const gf = await findGrandFinals(tournamentId, stage_id);
        if (gf && gf.squad_b_id === winner_id) {
          return { match: gf as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
      }
    } else {
      const isOddRound = round % 2 === 1;
      if (isOddRound) {
        const next = await findNextMatch(tournamentId, round + 1, match_number, ['losers'], stage_id);
        if (next && next.squad_a_id === winner_id) {
          return { match: next as unknown as TournamentMatch, slot: 'squad_a_id' };
        }
        // LB champion fallback in standard DE: check GF
        const gf = await findGrandFinals(tournamentId, stage_id);
        if (gf && gf.squad_b_id === winner_id) {
          return { match: gf as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
      } else {
        const nextMN = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
        const next = await findNextMatch(tournamentId, round + 1, nextMN, ['losers'], stage_id);
        if (next && (next as Record<string, unknown>)[slot] === winner_id) {
          return { match: next as unknown as TournamentMatch, slot };
        }
        const gf = await findGrandFinals(tournamentId, stage_id);
        if (gf && gf.squad_b_id === winner_id) {
          return { match: gf as unknown as TournamentMatch, slot: 'squad_b_id' };
        }
      }
    }
  }

  return null;
}

// Find the LB match that the loser of a WB match was dropped into.
async function findDownstreamLoserTarget(
  tournamentId: string,
  match: TournamentMatch,
  k: number,
): Promise<{ match: TournamentMatch; slot: string } | null> {
  if (match.bracket_type !== 'winners' || !match.winner_id) return null;

  const loserId = match.winner_id === match.squad_a_id ? match.squad_b_id : match.squad_a_id;
  if (!loserId) return null;

  const { round, match_number, stage_id } = match;
  const nextRound = round + 1;
  const nextMN = Math.ceil(match_number / 2);

  if (k > 0) {
    const nextWbMatch = await findNextMatch(tournamentId, nextRound, nextMN, ['winners'], stage_id);
    if (!nextWbMatch) {
      // WB Final loser -> SF squad_a
      const sf = await findSemiFinals(tournamentId, stage_id);
      if (sf && sf.squad_a_id === loserId) {
        return { match: sf as unknown as TournamentMatch, slot: 'squad_a_id' };
      }
    } else {
      const lbRound = k + 2 * round - 1;
      const lb = await findNextMatch(tournamentId, lbRound, match_number, ['losers'], stage_id);
      if (lb && lb.squad_b_id === loserId) {
        return { match: lb as unknown as TournamentMatch, slot: 'squad_b_id' };
      }
    }
  } else {
    if (round === 1) {
      const lbMN = Math.ceil(match_number / 2);
      const lbSlot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
      const lb = await findNextMatch(tournamentId, 1, lbMN, ['losers'], stage_id);
      if (lb && (lb as Record<string, unknown>)[lbSlot] === loserId) {
        return { match: lb as unknown as TournamentMatch, slot: lbSlot };
      }
    } else {
      const lbRound = 2 * (round - 1);
      const lb = await findNextMatch(tournamentId, lbRound, match_number, ['losers'], stage_id);
      if (lb && lb.squad_b_id === loserId) {
        return { match: lb as unknown as TournamentMatch, slot: 'squad_b_id' };
      }
    }
  }

  return null;
}

// Recursively cascade-reset a downstream match if it was already completed.
// Clears the team from this match's slot, and if this match had a result,
// resets this match and cascades further.
async function cascadeResetDownstream(
  tournamentId: string,
  downstreamMatch: TournamentMatch,
  slot: string,
  k: number,
  visited: Set<string>,
) {
  if (visited.has(downstreamMatch.id)) return;
  visited.add(downstreamMatch.id);

  // If the downstream match was completed, we need to reset it and cascade further
  if (downstreamMatch.status === 'completed' && downstreamMatch.winner_id) {
    // First, cascade the winner's advancement
    const winnerTarget = await findDownstreamWinnerTarget(tournamentId, downstreamMatch, k);
    if (winnerTarget) {
      await cascadeResetDownstream(tournamentId, winnerTarget.match, winnerTarget.slot, k, visited);
    }

    // If this was a WB match, also cascade the loser's LB dropdown
    if (downstreamMatch.bracket_type === 'winners') {
      const loserTarget = await findDownstreamLoserTarget(tournamentId, downstreamMatch, k);
      if (loserTarget) {
        await cascadeResetDownstream(tournamentId, loserTarget.match, loserTarget.slot, k, visited);
      }
    }

    // Reset this downstream match
    await resetSingleMatch(downstreamMatch.id);
  }

  // Clear the team from the slot (whether match was completed or just had team placed)
  const { error: clearErr } = await supabase
    .from('tournament_matches')
    .update({ [slot]: null })
    .eq('id', downstreamMatch.id);
  if (clearErr) throw new Error(`cascadeResetDownstream slot clear failed: ${clearErr.message}`);
}

// Main entry: revert all advancement from a completed match, cascading through the bracket.
export async function revertWinnerAdvancement(
  tournamentId: string,
  completedMatch: TournamentMatch
) {
  if (!completedMatch.winner_id) return;

  const k = await fetchStageK(completedMatch.stage_id);
  const visited = new Set<string>();

  // 1. Cascade reset the winner's downstream match
  const winnerTarget = await findDownstreamWinnerTarget(tournamentId, completedMatch, k);
  if (winnerTarget) {
    await cascadeResetDownstream(tournamentId, winnerTarget.match, winnerTarget.slot, k, visited);
  }

  // 2. For WB matches, also cascade reset the loser's LB downstream match
  if (completedMatch.bracket_type === 'winners') {
    const loserTarget = await findDownstreamLoserTarget(tournamentId, completedMatch, k);
    if (loserTarget) {
      await cascadeResetDownstream(tournamentId, loserTarget.match, loserTarget.slot, k, visited);
    }
  }
}

// Advance the winner of a completed match to the next round
export async function advanceWinnerToNextRound(
  tournamentId: string,
  completedMatch: TournamentMatch
) {
  const { bracket_type, round, match_number, winner_id, stage_id } = completedMatch;
  if (!winner_id) return;

  if (bracket_type === 'winners') {
    const nextRound = round + 1;
    const nextMatchNumber = Math.ceil(match_number / 2);
    const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

    const nextMatch = await findNextMatch(
      tournamentId, nextRound, nextMatchNumber, ['winners', 'finals'], stage_id
    );

    if (nextMatch) {
      const { error: advErr } = await supabase
        .from('tournament_matches')
        .update({ [slot]: winner_id })
        .eq('id', nextMatch.id);
      if (advErr) throw new Error(advErr.message);
    } else {
      // WB Final: no more WB rounds, advance winner to Grand Finals slot A
      const gfMatch = await findGrandFinals(tournamentId, stage_id);
      if (gfMatch) {
        const { error: advErr } = await supabase
          .from('tournament_matches')
          .update({ squad_a_id: winner_id })
          .eq('id', gfMatch.id);
        if (advErr) throw new Error(advErr.message);
      }
    }

    await advanceLoserToLosersBracket(tournamentId, completedMatch);
  }

  if (bracket_type === 'semi_finals') {
    const gfMatch = await findGrandFinals(tournamentId, stage_id);
    if (gfMatch) {
      const { error: advErr } = await supabase
        .from('tournament_matches')
        .update({ squad_b_id: winner_id })
        .eq('id', gfMatch.id);
      if (advErr) throw new Error(advErr.message);
    }
  }

  if (bracket_type === 'losers') {
    const k = await fetchStageK(stage_id);

    if (k > 0) {
      const offset = round - k;

      if (round < k) {
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

        const nextMatch = await findNextMatch(
          tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ [slot]: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
          await checkAndAutoCompleteBye(tournamentId, nextMatch.id);
        }
      } else if (round === k) {
        const nextMatch = await findNextMatch(
          tournamentId, round + 1, match_number, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ squad_a_id: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
          await checkAndAutoCompleteBye(tournamentId, nextMatch.id);
        }
      } else if (offset % 2 === 1) {
        // Mixed round → next is pure (half matches) → use SE halving
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

        const nextMatch = await findNextMatch(
          tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ [slot]: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
          await checkAndAutoCompleteBye(tournamentId, nextMatch.id);
        } else {
          const sfMatch = await findSemiFinals(tournamentId, stage_id);
          if (sfMatch) {
            const { error: advErr } = await supabase
              .from('tournament_matches')
              .update({ squad_b_id: winner_id })
              .eq('id', sfMatch.id);
            if (advErr) throw new Error(advErr.message);
          } else {
            const gfMatch = await findGrandFinals(tournamentId, stage_id);
            if (gfMatch) {
              const { error: advErr } = await supabase
                .from('tournament_matches')
                .update({ squad_b_id: winner_id })
                .eq('id', gfMatch.id);
              if (advErr) throw new Error(advErr.message);
            }
          }
        }
      } else {
        // Pure round → next is mixed (same match count) → use passthrough
        const nextMatch = await findNextMatch(
          tournamentId, round + 1, match_number, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ squad_a_id: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
        } else {
          // LB Champion: no more LB rounds, advance to SF slot B (or GF slot B if no SF)
          const sfMatch = await findSemiFinals(tournamentId, stage_id);
          if (sfMatch) {
            const { error: advErr } = await supabase
              .from('tournament_matches')
              .update({ squad_b_id: winner_id })
              .eq('id', sfMatch.id);
            if (advErr) throw new Error(advErr.message);
          } else {
            const gfMatch = await findGrandFinals(tournamentId, stage_id);
            if (gfMatch) {
              const { error: advErr } = await supabase
                .from('tournament_matches')
                .update({ squad_b_id: winner_id })
                .eq('id', gfMatch.id);
              if (advErr) throw new Error(advErr.message);
            }
          }
        }
      }
    } else {
      const isOddRound = round % 2 === 1;

      if (isOddRound) {
        const nextMatch = await findNextMatch(
          tournamentId, round + 1, match_number, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ squad_a_id: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
        } else {
          // LB Champion in standard DE: advance to GF slot B
          const gfMatch = await findGrandFinals(tournamentId, stage_id);
          if (gfMatch) {
            const { error: advErr } = await supabase
              .from('tournament_matches')
              .update({ squad_b_id: winner_id })
              .eq('id', gfMatch.id);
            if (advErr) throw new Error(advErr.message);
          }
        }
      } else {
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

        const nextMatch = await findNextMatch(
          tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ [slot]: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
        } else {
          const gfMatch = await findGrandFinals(tournamentId, stage_id);
          if (gfMatch) {
            const { error: advErr } = await supabase
              .from('tournament_matches')
              .update({ squad_b_id: winner_id })
              .eq('id', gfMatch.id);
            if (advErr) throw new Error(advErr.message);
          }
        }
      }
    }
  }
}

// After placing a team into a match, check if the match is now a BYE
// (only one team present) and auto-complete it + advance the winner.
async function checkAndAutoCompleteBye(
  tournamentId: string,
  matchId: string,
) {
  const { data: match, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error || !match || match.status !== 'pending') return;

  const hasA = !!match.squad_a_id;
  const hasB = !!match.squad_b_id;

  // Not a BYE if both teams present, or neither team present
  if ((hasA && hasB) || (!hasA && !hasB)) return;

  const winnerId = hasA ? match.squad_a_id : match.squad_b_id;
  const bestOf = match.best_of || 1;
  const winScore = Math.ceil(bestOf / 2);

  const { error: compErr } = await supabase
    .from('tournament_matches')
    .update({
      winner_id: winnerId,
      status: 'completed' as MatchStatus,
      squad_a_score: hasA ? winScore : 0,
      squad_b_score: hasB ? winScore : 0,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (compErr) throw new Error(`checkAndAutoCompleteBye failed: ${compErr.message}`);

  // Advance the winner to the next round
  await advanceWinnerToNextRound(tournamentId, {
    ...match,
    winner_id: winnerId,
  } as unknown as TournamentMatch);
}

// Advance the loser of a winners bracket match to the losers bracket
export async function advanceLoserToLosersBracket(
  tournamentId: string,
  completedMatch: TournamentMatch
) {
  if (completedMatch.bracket_type !== 'winners') return;

  const loserId = completedMatch.winner_id === completedMatch.squad_a_id
    ? completedMatch.squad_b_id
    : completedMatch.squad_a_id;

  if (!loserId) return;

  // Skip entirely if no losers bracket exists (e.g., single elimination)
  const { count: lbCount } = await supabase
    .from('tournament_matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('bracket_type', 'losers')
    .limit(1);
  if (!lbCount || lbCount === 0) return;

  const { round, match_number, stage_id } = completedMatch;
  const k = await fetchStageK(stage_id);

  if (k > 0) {
    const nextWbRound = round + 1;
    const nextWbMatchNumber = Math.ceil(match_number / 2);
    const nextWbMatch = await findNextMatch(
      tournamentId, nextWbRound, nextWbMatchNumber, ['winners'], stage_id
    );

    if (!nextWbMatch) {
      const sfMatch = await findSemiFinals(tournamentId, stage_id);
      if (sfMatch) {
        const { error: advErr } = await supabase
          .from('tournament_matches')
          .update({ squad_a_id: loserId })
          .eq('id', sfMatch.id);
        if (advErr) throw new Error(advErr.message);
      }
    } else {
      const lbRound = k + 2 * round - 1;

      const lbMatch = await findNextMatch(
        tournamentId, lbRound, match_number, ['losers'], stage_id
      );

      if (lbMatch) {
        const { error: advErr } = await supabase
          .from('tournament_matches')
          .update({ squad_b_id: loserId })
          .eq('id', lbMatch.id);
        if (advErr) throw new Error(advErr.message);
        // Check if the LB match is now a BYE (only one team) and auto-complete
        await checkAndAutoCompleteBye(tournamentId, lbMatch.id);
      }
    }
  } else {
    if (round === 1) {
      const lbMatchNumber = Math.ceil(match_number / 2);
      const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

      const lbMatch = await findNextMatch(
        tournamentId, 1, lbMatchNumber, ['losers'], stage_id
      );

      if (lbMatch) {
        const { error: advErr } = await supabase
          .from('tournament_matches')
          .update({ [slot]: loserId })
          .eq('id', lbMatch.id);
        if (advErr) throw new Error(advErr.message);
        await checkAndAutoCompleteBye(tournamentId, lbMatch.id);
      }
    } else {
      const lbRound = 2 * (round - 1);

      const lbMatch = await findNextMatch(
        tournamentId, lbRound, match_number, ['losers'], stage_id
      );

      if (lbMatch) {
        const { error: advErr } = await supabase
          .from('tournament_matches')
          .update({ squad_b_id: loserId })
          .eq('id', lbMatch.id);
        if (advErr) throw new Error(advErr.message);
        await checkAndAutoCompleteBye(tournamentId, lbMatch.id);
      }
    }
  }
}

// Auto-complete bye matches (one squad vs null) after bracket generation
export async function autoCompleteByes(tournamentId: string, stageId?: string) {
  let queryA = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_b_id', null)
    .not('squad_a_id', 'is', null);

  if (stageId) {
    queryA = queryA.eq('stage_id', stageId);
  }

  const { data: byeMatches, error: queryAErr } = await queryA;
  if (queryAErr) throw new Error(`autoCompleteByes queryA failed: ${queryAErr.message}`);

  if (!byeMatches) return;

  for (const match of byeMatches) {
    const { error: compErr } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_a_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 1,
        squad_b_score: 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    if (compErr) throw new Error(`autoCompleteByes update failed: ${compErr.message}`);

    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_a_id,
    } as unknown as TournamentMatch);
  }

  let queryB = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_a_id', null)
    .not('squad_b_id', 'is', null);

  if (stageId) {
    queryB = queryB.eq('stage_id', stageId);
  }

  const { data: reverseByes, error: queryBErr } = await queryB;
  if (queryBErr) throw new Error(`autoCompleteByes queryB failed: ${queryBErr.message}`);

  if (!reverseByes) return;

  for (const match of reverseByes) {
    const { error: compErr } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_b_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 0,
        squad_b_score: 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    if (compErr) throw new Error(`autoCompleteByes reverse update failed: ${compErr.message}`);

    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_b_id,
    } as unknown as TournamentMatch);
  }

  // Third pass: LB byes created by WB bye advancement (any round)
  let queryLB_A = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('bracket_type', 'losers')
    .eq('status', 'pending')
    .is('squad_b_id', null)
    .not('squad_a_id', 'is', null);
  if (stageId) queryLB_A = queryLB_A.eq('stage_id', stageId);
  const { data: lbByesA, error: lbAErr } = await queryLB_A;
  if (lbAErr) throw new Error(`autoCompleteByes LB queryA failed: ${lbAErr.message}`);

  for (const match of lbByesA || []) {
    const { error: compErr } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_a_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 1,
        squad_b_score: 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    if (compErr) throw new Error(`autoCompleteByes LB update failed: ${compErr.message}`);
    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_a_id,
    } as unknown as TournamentMatch);
  }

  let queryLB_B = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('bracket_type', 'losers')
    .eq('status', 'pending')
    .is('squad_a_id', null)
    .not('squad_b_id', 'is', null);
  if (stageId) queryLB_B = queryLB_B.eq('stage_id', stageId);
  const { data: lbByesB, error: lbBErr } = await queryLB_B;
  if (lbBErr) throw new Error(`autoCompleteByes LB queryB failed: ${lbBErr.message}`);

  for (const match of lbByesB || []) {
    const { error: compErr } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_b_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 0,
        squad_b_score: 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    if (compErr) throw new Error(`autoCompleteByes LB reverse update failed: ${compErr.message}`);
    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_b_id,
    } as unknown as TournamentMatch);
  }
}
