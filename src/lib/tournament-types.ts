// Tournament-specific types
import type { Json } from '@/integrations/supabase/types';

export type TournamentStatus = 'registration_open' | 'registration_closed' | 'bracket_generated' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type MatchStatus = 'pending' | 'ongoing' | 'completed' | 'disputed';
export type SquadMemberRole = 'main' | 'substitute';

export interface PrizeTier {
  place: number;
  label: string;
  prize: string;
  distributed: boolean;
}

export interface Tournament {
  id: string;
  host_id: string;
  name: string;
  description: string | null;
  rules: string | null;
  date_time: string;
  max_squads: number;
  status: TournamentStatus;
  format: TournamentFormat | null;
  prize_wallet: string | null;
  banner_url: string | null;
  prize_pool: string | null;
  team_size: string | null;
  entry_fee: string | null;
  region: string | null;
  contact_info: string | null;
  prize_tiers: PrizeTier[] | null;
  is_multi_stage: boolean;
  created_at: string;
  updated_at: string;
}

export interface TournamentSquad {
  id: string;
  name: string;
  leader_id: string;
  existing_squad_id: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberStatus = 'active' | 'inactive';

export interface TournamentSquadMember {
  id: string;
  tournament_squad_id: string;
  ign: string;
  mlbb_id: string;
  user_id: string | null;
  role: SquadMemberRole;
  position: number;
  member_status: MemberStatus;
  created_at: string;
}

export interface RosterSnapshotEntry {
  id: string;
  ign: string;
  mlbb_id: string;
  role: SquadMemberRole;
  position: number;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  tournament_squad_id: string;
  registered_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  seed: number | null;
  // Roster lock fields
  roster_locked: boolean;
  roster_locked_at: string | null;
  roster_snapshot: Json | null; // Parsed as RosterSnapshotEntry[]
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  bracket_type: 'winners' | 'losers' | 'finals';
  squad_a_id: string | null;
  squad_b_id: string | null;
  winner_id: string | null;
  status: MatchStatus;
  best_of: 1 | 3 | 5;
  squad_a_score: number;
  squad_b_score: number;
  result_screenshot: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  // Multi-stage fields
  stage_id: string | null;
  group_id: string | null;
  // Check-in & forfeit
  squad_a_checked_in: boolean;
  squad_b_checked_in: boolean;
  is_forfeit: boolean;
  // Dispute
  dispute_reason: string | null;
  dispute_screenshot: string | null;
  dispute_raised_by: string | null;
  dispute_resolved_by: string | null;
  dispute_resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  squad_a?: TournamentSquad;
  squad_b?: TournamentSquad;
}

export type RosterChangeStatus = 'pending' | 'approved' | 'rejected';

export interface RosterChange {
  id: string;
  tournament_squad_id: string;
  tournament_id: string;
  stage_id: string | null;
  player_out_ign: string;
  player_in_ign: string;
  player_in_mlbb_id: string;
  status: RosterChangeStatus;
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  changed_at: string;
}

// Tournament with registrations count
export interface TournamentWithDetails extends Tournament {
  registrations_count?: number;
  host_profile?: {
    ign: string;
    avatar_url: string | null;
  };
}

// Match with squad details for bracket display
export interface MatchWithSquads extends Omit<TournamentMatch, 'squad_a' | 'squad_b'> {
  squad_a: TournamentSquad | null;
  squad_b: TournamentSquad | null;
}

// Bracket generation helpers
export const MAX_SQUAD_SIZES = [8, 16, 32, 64] as const;
export const BEST_OF_OPTIONS = [1, 3, 5] as const;

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  bracket_generated: 'Bracket Generated',
  ongoing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: 'Pending',
  ongoing: 'In Progress',
  completed: 'Completed',
  disputed: 'Disputed',
};

// Score validation helper
export function validateMatchScores(
  bestOf: 1 | 3 | 5,
  scoreA: number,
  scoreB: number
): { valid: boolean; error?: string } {
  const winsNeeded = Math.ceil(bestOf / 2); // 1 for Bo1, 2 for Bo3, 3 for Bo5

  if (scoreA < 0 || scoreB < 0) {
    return { valid: false, error: 'Scores cannot be negative' };
  }

  if (scoreA === scoreB) {
    return { valid: false, error: 'Match cannot end in a tie' };
  }

  const winnerScore = Math.max(scoreA, scoreB);
  const loserScore = Math.min(scoreA, scoreB);

  if (winnerScore !== winsNeeded) {
    return { valid: false, error: `Winner must have exactly ${winsNeeded} wins in a Bo${bestOf}` };
  }

  if (loserScore >= winsNeeded) {
    return { valid: false, error: `Loser cannot have ${winsNeeded} or more wins` };
  }

  return { valid: true };
}

// Notification types
export type NotificationType =
  | 'registration_approved'
  | 'registration_rejected'
  | 'roster_change_approved'
  | 'roster_change_rejected'
  | 'tournament_cancelled'
  | 'dispute_raised';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  tournament_id: string | null;
  read: boolean;
  created_at: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  tournament_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

// ========== Multi-Stage Types ==========

export type StageStatus = 'pending' | 'configuring' | 'ongoing' | 'completed';

export interface TournamentStage {
  id: string;
  tournament_id: string;
  stage_number: number;
  name: string;
  format: TournamentFormat;
  best_of: 1 | 3 | 5;
  finals_best_of: 1 | 3 | 5 | null;
  status: StageStatus;
  group_count: number;
  advance_per_group: number;
  advance_best_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentGroup {
  id: string;
  stage_id: string;
  tournament_id: string;
  label: string;
  created_at: string;
}

export interface TournamentGroupTeam {
  id: string;
  group_id: string;
  tournament_squad_id: string;
}

export interface GroupStanding {
  squad_id: string;
  squad: TournamentSquad;
  played: number;
  wins: number;
  losses: number;
  score_for: number;
  score_against: number;
  points: number;
}

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Pending',
  configuring: 'Configuring',
  ongoing: 'In Progress',
  completed: 'Completed',
};
