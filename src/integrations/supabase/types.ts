export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      group_draws: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          draw_seed: string
          draw_sequence: Json
          id: string
          stage_id: string
          tournament_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          draw_seed: string
          draw_sequence?: Json
          id?: string
          stage_id: string
          tournament_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          draw_seed?: string
          draw_sequence?: Json
          id?: string
          stage_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_draws_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_draws_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      heroes: {
        Row: {
          created_at: string
          hero_class: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_class?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_class?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_drafts: {
        Row: {
          created_at: string
          id: string
          match_id: string
          notes: string | null
          squad_a_bans: string[]
          squad_a_ingame_bans: string[]
          squad_b_bans: string[]
          squad_b_ingame_bans: string[]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          notes?: string | null
          squad_a_bans?: string[]
          squad_a_ingame_bans?: string[]
          squad_b_bans?: string[]
          squad_b_ingame_bans?: string[]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          notes?: string | null
          squad_a_bans?: string[]
          squad_a_ingame_bans?: string[]
          squad_b_bans?: string[]
          squad_b_ingame_bans?: string[]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_drafts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          tournament_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          tournament_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          tournament_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contacts: Json | null
          created_at: string
          favorite_heroes: string[] | null
          has_completed_onboarding: boolean | null
          hero_class: string
          id: string
          ign: string
          looking_for_squad: boolean
          main_role: string
          main_roles: string[] | null
          mlbb_id: string | null
          rank: string
          screenshots: string[] | null
          server: string
          state: string | null
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contacts?: Json | null
          created_at?: string
          favorite_heroes?: string[] | null
          has_completed_onboarding?: boolean | null
          hero_class?: string
          id?: string
          ign: string
          looking_for_squad?: boolean
          main_role?: string
          main_roles?: string[] | null
          mlbb_id?: string | null
          rank?: string
          screenshots?: string[] | null
          server?: string
          state?: string | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contacts?: Json | null
          created_at?: string
          favorite_heroes?: string[] | null
          has_completed_onboarding?: boolean | null
          hero_class?: string
          id?: string
          ign?: string
          looking_for_squad?: boolean
          main_role?: string
          main_roles?: string[] | null
          mlbb_id?: string | null
          rank?: string
          screenshots?: string[] | null
          server?: string
          state?: string | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      roster_changes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          changed_at: string
          id: string
          player_in_ign: string
          player_in_mlbb_id: string
          player_out_ign: string
          reason: string | null
          stage_id: string | null
          status: string | null
          tournament_id: string
          tournament_squad_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          changed_at?: string
          id?: string
          player_in_ign: string
          player_in_mlbb_id: string
          player_out_ign: string
          reason?: string | null
          stage_id?: string | null
          status?: string | null
          tournament_id: string
          tournament_squad_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          changed_at?: string
          id?: string
          player_in_ign?: string
          player_in_mlbb_id?: string
          player_out_ign?: string
          reason?: string | null
          stage_id?: string | null
          status?: string | null
          tournament_id?: string
          tournament_squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_changes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_changes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_changes_tournament_squad_id_fkey"
            columns: ["tournament_squad_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string | null
          squad_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message?: string | null
          squad_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string | null
          squad_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_applications_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_profile_id: string
          invited_user_id: string
          message: string | null
          squad_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_profile_id: string
          invited_user_id: string
          message?: string | null
          squad_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_profile_id?: string
          invited_user_id?: string
          message?: string | null
          squad_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_invitations_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_invitations_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          id: string
          ign: string | null
          joined_at: string
          mlbb_id: string | null
          position: number
          profile_id: string | null
          role: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          id?: string
          ign?: string | null
          joined_at?: string
          mlbb_id?: string | null
          position?: number
          profile_id?: string | null
          role?: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          id?: string
          ign?: string | null
          joined_at?: string
          mlbb_id?: string | null
          position?: number
          profile_id?: string | null
          role?: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          contacts: Json | null
          created_at: string
          description: string | null
          id: string
          is_recruiting: boolean
          logo_url: string | null
          max_members: number | null
          member_count: number
          min_rank: string
          name: string
          needed_roles: string[] | null
          owner_id: string
          server: string
          updated_at: string
        }
        Insert: {
          contacts?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_recruiting?: boolean
          logo_url?: string | null
          max_members?: number | null
          member_count?: number
          min_rank?: string
          name: string
          needed_roles?: string[] | null
          owner_id: string
          server?: string
          updated_at?: string
        }
        Update: {
          contacts?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_recruiting?: boolean
          logo_url?: string | null
          max_members?: number | null
          member_count?: number
          min_rank?: string
          name?: string
          needed_roles?: string[] | null
          owner_id?: string
          server?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          tournament_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          tournament_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          tournament_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_audit_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_group_teams: {
        Row: {
          created_at: string
          group_id: string
          id: string
          tournament_squad_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          tournament_squad_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          tournament_squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_group_teams_tournament_squad_id_fkey"
            columns: ["tournament_squad_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          created_at: string
          id: string
          label: string
          stage_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          stage_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          stage_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          message: string | null
          squad_id: string
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          message?: string | null
          squad_id: string
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          message?: string | null
          squad_id?: string
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invitations_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          best_of: number
          blue_side_team: string | null
          bracket_type: string | null
          completed_at: string | null
          created_at: string
          dispute_raised_by: string | null
          dispute_reason: string | null
          dispute_resolution_notes: string | null
          dispute_resolved_by: string | null
          dispute_screenshot: string | null
          group_id: string | null
          id: string
          is_forfeit: boolean | null
          match_number: number
          red_side_team: string | null
          result_screenshot: string | null
          round: number
          scheduled_time: string | null
          squad_a_checked_in: boolean | null
          squad_a_id: string | null
          squad_a_score: number | null
          squad_b_checked_in: boolean | null
          squad_b_id: string | null
          squad_b_score: number | null
          stage_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          toss_completed_at: string | null
          toss_winner: string | null
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          best_of?: number
          blue_side_team?: string | null
          bracket_type?: string | null
          completed_at?: string | null
          created_at?: string
          dispute_raised_by?: string | null
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_by?: string | null
          dispute_screenshot?: string | null
          group_id?: string | null
          id?: string
          is_forfeit?: boolean | null
          match_number: number
          red_side_team?: string | null
          result_screenshot?: string | null
          round: number
          scheduled_time?: string | null
          squad_a_checked_in?: boolean | null
          squad_a_id?: string | null
          squad_a_score?: number | null
          squad_b_checked_in?: boolean | null
          squad_b_id?: string | null
          squad_b_score?: number | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          toss_completed_at?: string | null
          toss_winner?: string | null
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number
          blue_side_team?: string | null
          bracket_type?: string | null
          completed_at?: string | null
          created_at?: string
          dispute_raised_by?: string | null
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_by?: string | null
          dispute_screenshot?: string | null
          group_id?: string | null
          id?: string
          is_forfeit?: boolean | null
          match_number?: number
          red_side_team?: string | null
          result_screenshot?: string | null
          round?: number
          scheduled_time?: string | null
          squad_a_checked_in?: boolean | null
          squad_a_id?: string | null
          squad_a_score?: number | null
          squad_b_checked_in?: boolean | null
          squad_b_id?: string | null
          squad_b_score?: number | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          toss_completed_at?: string | null
          toss_winner?: string | null
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_blue_side_team_fkey"
            columns: ["blue_side_team"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_red_side_team_fkey"
            columns: ["red_side_team"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_squad_a_id_fkey"
            columns: ["squad_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_squad_b_id_fkey"
            columns: ["squad_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_toss_winner_fkey"
            columns: ["toss_winner"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          id: string
          registered_at: string
          roster_locked: boolean | null
          roster_locked_at: string | null
          roster_snapshot: Json | null
          seed: number | null
          status: string
          tournament_id: string
          tournament_squad_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          roster_locked?: boolean | null
          roster_locked_at?: string | null
          roster_snapshot?: Json | null
          seed?: number | null
          status?: string
          tournament_id: string
          tournament_squad_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          roster_locked?: boolean | null
          roster_locked_at?: string | null
          roster_snapshot?: Json | null
          seed?: number | null
          status?: string
          tournament_id?: string
          tournament_squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_squad_id_fkey"
            columns: ["tournament_squad_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_squad_members: {
        Row: {
          created_at: string
          id: string
          ign: string
          member_status: string
          mlbb_id: string
          position: number
          role: Database["public"]["Enums"]["squad_member_role"]
          tournament_squad_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ign: string
          member_status?: string
          mlbb_id: string
          position: number
          role?: Database["public"]["Enums"]["squad_member_role"]
          tournament_squad_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ign?: string
          member_status?: string
          mlbb_id?: string
          position?: number
          role?: Database["public"]["Enums"]["squad_member_role"]
          tournament_squad_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_squad_members_tournament_squad_id_fkey"
            columns: ["tournament_squad_id"]
            isOneToOne: false
            referencedRelation: "tournament_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_squads: {
        Row: {
          created_at: string
          existing_squad_id: string | null
          id: string
          leader_id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          existing_squad_id?: string | null
          id?: string
          leader_id: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          existing_squad_id?: string | null
          id?: string
          leader_id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_squads_existing_squad_id_fkey"
            columns: ["existing_squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          advance_best_remaining: number
          advance_per_group: number
          advance_to_lower_per_group: number
          best_of: number
          created_at: string
          finals_best_of: number
          format: Database["public"]["Enums"]["tournament_format"]
          group_count: number
          id: string
          lb_initial_rounds: number
          name: string
          stage_number: number
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          advance_best_remaining?: number
          advance_per_group?: number
          advance_to_lower_per_group?: number
          best_of?: number
          created_at?: string
          finals_best_of?: number
          format: Database["public"]["Enums"]["tournament_format"]
          group_count?: number
          id?: string
          lb_initial_rounds?: number
          name: string
          stage_number: number
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          advance_best_remaining?: number
          advance_per_group?: number
          advance_to_lower_per_group?: number
          best_of?: number
          created_at?: string
          finals_best_of?: number
          format?: Database["public"]["Enums"]["tournament_format"]
          group_count?: number
          id?: string
          lb_initial_rounds?: number
          name?: string
          stage_number?: number
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          contact_info: string | null
          created_at: string
          date_time: string
          description: string | null
          entry_fee: string | null
          format: Database["public"]["Enums"]["tournament_format"] | null
          host_id: string
          id: string
          is_multi_stage: boolean
          max_squads: number
          name: string
          prize_pool: string | null
          prize_tiers: Json | null
          prize_wallet: string | null
          region: string | null
          rules: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          team_size: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          contact_info?: string | null
          created_at?: string
          date_time: string
          description?: string | null
          entry_fee?: string | null
          format?: Database["public"]["Enums"]["tournament_format"] | null
          host_id: string
          id?: string
          is_multi_stage?: boolean
          max_squads?: number
          name: string
          prize_pool?: string | null
          prize_tiers?: Json | null
          prize_wallet?: string | null
          region?: string | null
          rules?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          contact_info?: string | null
          created_at?: string
          date_time?: string
          description?: string | null
          entry_fee?: string | null
          format?: Database["public"]["Enums"]["tournament_format"] | null
          host_id?: string
          id?: string
          is_multi_stage?: boolean
          max_squads?: number
          name?: string
          prize_pool?: string | null
          prize_tiers?: Json | null
          prize_wallet?: string | null
          region?: string | null
          rules?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_mlbb_id: { Args: { p_input: string }; Returns: string }
      rpc_approve_roster_change: {
        Args: { p_change_id: string }
        Returns: undefined
      }
      rpc_register_for_tournament: {
        Args: {
          p_existing_squad_id: string
          p_logo_url: string
          p_members: Json
          p_squad_name: string
          p_tournament_id: string
        }
        Returns: string
      }
      search_profiles:
        | {
            Args: { exclude_squad_id?: string; search_term: string }
            Returns: {
              avatar_url: string
              contacts: Json
              id: string
              ign: string
              main_role: string
              mlbb_id: string
              rank: string
              user_id: string
            }[]
          }
        | {
            Args: {
              exclude_squad_id?: string
              for_tournament?: boolean
              search_term: string
            }
            Returns: {
              avatar_url: string
              contacts: Json
              id: string
              ign: string
              main_role: string
              mlbb_id: string
              rank: string
              user_id: string
            }[]
          }
        | {
            Args: {
              add_to_squad?: boolean
              exclude_squad_id?: string
              for_tournament?: boolean
              search_term: string
            }
            Returns: {
              avatar_url: string
              contacts: Json
              id: string
              ign: string
              main_role: string
              mlbb_id: string
              rank: string
              user_id: string
            }[]
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      match_status: "pending" | "ongoing" | "completed" | "disputed"
      squad_member_role: "main" | "substitute"
      squad_member_squad_role: "leader" | "co_leader" | "member"
      tournament_format:
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
      tournament_status:
        | "registration_open"
        | "registration_closed"
        | "bracket_generated"
        | "ongoing"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      match_status: ["pending", "ongoing", "completed", "disputed"],
      squad_member_role: ["main", "substitute"],
      squad_member_squad_role: ["leader", "co_leader", "member"],
      tournament_format: [
        "single_elimination",
        "double_elimination",
        "round_robin",
      ],
      tournament_status: [
        "registration_open",
        "registration_closed",
        "bracket_generated",
        "ongoing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
