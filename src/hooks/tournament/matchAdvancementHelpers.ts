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

// Revert a previously advanced winner from the next match slot (for dispute resolution)
export async function revertWinnerAdvancement(
  tournamentId: string,
  completedMatch: TournamentMatch
) {
  const { bracket_type, round, match_number, winner_id, stage_id } = completedMatch;
  if (!winner_id) return;

  if (bracket_type === 'winners') {
    // 1. Remove winner from next WB match
    const nextRound = round + 1;
    const nextMatchNumber = Math.ceil(match_number / 2);
    const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';

    const nextMatch = await findNextMatch(
      tournamentId, nextRound, nextMatchNumber, ['winners', 'finals'], stage_id
    );

    if (nextMatch && (nextMatch as Record<string, unknown>)[slot] === winner_id) {
      await supabase
        .from('tournament_matches')
        .update({ [slot]: null })
        .eq('id', nextMatch.id);
    }

    // 2. Remove loser from the LB match they were dropped into
    const loserId = winner_id === completedMatch.squad_a_id
      ? completedMatch.squad_b_id
      : completedMatch.squad_a_id;

    if (loserId) {
      const k = await fetchStageK(stage_id);

      if (k > 0) {
        // Seeded DE: check if this was the WB Final (loser goes to SF)
        const nextWbMatch = await findNextMatch(
          tournamentId, nextRound, nextMatchNumber, ['winners'], stage_id
        );

        if (!nextWbMatch) {
          // WB Final loser -> Semi-Finals squad_a
          const sfMatch = await findSemiFinals(tournamentId, stage_id);
          if (sfMatch && sfMatch.squad_a_id === loserId) {
            await supabase.from('tournament_matches').update({ squad_a_id: null }).eq('id', sfMatch.id);
          }
        } else {
          // Loser -> LB round k + 2*round - 1, same match_number, squad_b slot
          const lbRound = k + 2 * round - 1;
          const lbMatch = await findNextMatch(tournamentId, lbRound, match_number, ['losers'], stage_id);
          if (lbMatch && lbMatch.squad_b_id === loserId) {
            await supabase.from('tournament_matches').update({ squad_b_id: null }).eq('id', lbMatch.id);
          }
        }
      } else {
        // Standard DE
        if (round === 1) {
          // WB R1 losers -> LB R1: ceil(match_number/2), slot by odd/even
          const lbMatchNumber = Math.ceil(match_number / 2);
          const lbSlot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
          const lbMatch = await findNextMatch(tournamentId, 1, lbMatchNumber, ['losers'], stage_id);
          if (lbMatch && (lbMatch as Record<string, unknown>)[lbSlot] === loserId) {
            await supabase.from('tournament_matches').update({ [lbSlot]: null }).eq('id', lbMatch.id);
          }
        } else {
          // WB R2+ losers -> LB round 2*(round-1), same match_number, squad_b slot
          const lbRound = 2 * (round - 1);
          const lbMatch = await findNextMatch(tournamentId, lbRound, match_number, ['losers'], stage_id);
          if (lbMatch && lbMatch.squad_b_id === loserId) {
            await supabase.from('tournament_matches').update({ squad_b_id: null }).eq('id', lbMatch.id);
          }
        }
      }
    }
  }

  if (bracket_type === 'semi_finals') {
    const gfMatch = await findGrandFinals(tournamentId, stage_id);
    if (gfMatch && gfMatch.squad_b_id === winner_id) {
      await supabase
        .from('tournament_matches')
        .update({ squad_b_id: null })
        .eq('id', gfMatch.id);
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
        const nextMatch = await findNextMatch(tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id);
        if (nextMatch && (nextMatch as Record<string, unknown>)[slot] === winner_id) {
          await supabase.from('tournament_matches').update({ [slot]: null }).eq('id', nextMatch.id);
        }
      } else if (round === k || offset % 2 === 1) {
        const nextMatch = await findNextMatch(tournamentId, round + 1, match_number, ['losers'], stage_id);
        if (nextMatch && nextMatch.squad_a_id === winner_id) {
          await supabase.from('tournament_matches').update({ squad_a_id: null }).eq('id', nextMatch.id);
        }
      } else {
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
        const nextMatch = await findNextMatch(tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id);
        if (nextMatch && (nextMatch as Record<string, unknown>)[slot] === winner_id) {
          await supabase.from('tournament_matches').update({ [slot]: null }).eq('id', nextMatch.id);
        } else {
          const sfMatch = await findSemiFinals(tournamentId, stage_id);
          if (sfMatch && sfMatch.squad_b_id === winner_id) {
            await supabase.from('tournament_matches').update({ squad_b_id: null }).eq('id', sfMatch.id);
          } else {
            const gfMatch = await findGrandFinals(tournamentId, stage_id);
            if (gfMatch && gfMatch.squad_b_id === winner_id) {
              await supabase.from('tournament_matches').update({ squad_b_id: null }).eq('id', gfMatch.id);
            }
          }
        }
      }
    } else {
      const isOddRound = round % 2 === 1;
      if (isOddRound) {
        const nextMatch = await findNextMatch(tournamentId, round + 1, match_number, ['losers'], stage_id);
        if (nextMatch && nextMatch.squad_a_id === winner_id) {
          await supabase.from('tournament_matches').update({ squad_a_id: null }).eq('id', nextMatch.id);
        }
      } else {
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(match_number / 2);
        const slot = match_number % 2 === 1 ? 'squad_a_id' : 'squad_b_id';
        const nextMatch = await findNextMatch(tournamentId, nextRound, nextMatchNumber, ['losers'], stage_id);
        if (nextMatch && (nextMatch as Record<string, unknown>)[slot] === winner_id) {
          await supabase.from('tournament_matches').update({ [slot]: null }).eq('id', nextMatch.id);
        } else {
          const gfMatch = await findGrandFinals(tournamentId, stage_id);
          if (gfMatch && gfMatch.squad_b_id === winner_id) {
            await supabase.from('tournament_matches').update({ squad_b_id: null }).eq('id', gfMatch.id);
          }
        }
      }
    }
  }
}

// Advance the winner of a completed match to the next round
export async function advanceWinnerToNextRound(
  tournamentId: string,
  completedMatch: TournamentMatch
) {
  const { bracket_type, round, match_number, winner_id, stage_id } = completedMatch;

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
        }
      } else if (offset % 2 === 1) {
        const nextMatch = await findNextMatch(
          tournamentId, round + 1, match_number, ['losers'], stage_id
        );

        if (nextMatch) {
          const { error: advErr } = await supabase
            .from('tournament_matches')
            .update({ squad_a_id: winner_id })
            .eq('id', nextMatch.id);
          if (advErr) throw new Error(advErr.message);
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

  const { data: byeMatches } = await queryA;

  if (!byeMatches) return;

  for (const match of byeMatches) {
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_a_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 1,
        squad_b_score: 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);

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

  const { data: reverseByes } = await queryB;

  if (!reverseByes) return;

  for (const match of reverseByes) {
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_b_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 0,
        squad_b_score: 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_b_id,
    } as unknown as TournamentMatch);
  }
}
