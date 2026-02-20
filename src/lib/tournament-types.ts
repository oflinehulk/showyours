// Tournament-specific types
import type { Json } from '@/integrations/supabase/types';

export type TournamentStatus = 'registration_open' | 'registration_closed' | 'bracket_generated' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type MatchStatus = 'pending' | 'ongoing' | 'completed' | 'disputed';
export type SquadMemberRole = 'main' | 'substitute';

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

export interface TournamentSquadMember {
  id: string;
  tournament_squad_id: string;
  ign: string;
  mlbb_id: string;
  user_id: string | null;
  role: SquadMemberRole;
  position: number;
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
  status: 'pending' | 'approved' | 'rejected';
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
export interface MatchWithSquads extends TournamentMatch {
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
