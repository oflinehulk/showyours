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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contacts: Json | null
          created_at: string
          favorite_heroes: string[] | null
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
          changed_at: string
          id: string
          player_in_ign: string
          player_in_mlbb_id: string
          player_out_ign: string
          tournament_id: string
          tournament_squad_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          player_in_ign: string
          player_in_mlbb_id: string
          player_out_ign: string
          tournament_id: string
          tournament_squad_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          player_in_ign?: string
          player_in_mlbb_id?: string
          player_out_ign?: string
          tournament_id?: string
          tournament_squad_id?: string
        }
        Relationships: [
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
      squad_members: {
        Row: {
          id: string
          joined_at: string
          position: number
          profile_id: string
          role: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          position?: number
          profile_id: string
          role?: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          position?: number
          profile_id?: string
          role?: Database["public"]["Enums"]["squad_member_squad_role"]
          squad_id?: string
          user_id?: string
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
      tournament_matches: {
        Row: {
          best_of: number
          bracket_type: string | null
          completed_at: string | null
          created_at: string
          id: string
          match_number: number
          result_screenshot: string | null
          round: number
          scheduled_time: string | null
          squad_a_id: string | null
          squad_a_score: number | null
          squad_b_id: string | null
          squad_b_score: number | null
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          best_of?: number
          bracket_type?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number: number
          result_screenshot?: string | null
          round: number
          scheduled_time?: string | null
          squad_a_id?: string | null
          squad_a_score?: number | null
          squad_b_id?: string | null
          squad_b_score?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number
          bracket_type?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number?: number
          result_screenshot?: string | null
          round?: number
          scheduled_time?: string | null
          squad_a_id?: string | null
          squad_a_score?: number | null
          squad_b_id?: string | null
          squad_b_score?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
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
          status: string
          tournament_id: string
          tournament_squad_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          status?: string
          tournament_id: string
          tournament_squad_id: string
        }
        Update: {
          id?: string
          registered_at?: string
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
      tournaments: {
        Row: {
          banner_url: string | null
          created_at: string
          date_time: string
          description: string | null
          format: Database["public"]["Enums"]["tournament_format"] | null
          host_id: string
          id: string
          max_squads: number
          name: string
          prize_wallet: string | null
          rules: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          date_time: string
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"] | null
          host_id: string
          id?: string
          max_squads?: number
          name: string
          prize_wallet?: string | null
          rules?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          date_time?: string
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"] | null
          host_id?: string
          id?: string
          max_squads?: number
          name?: string
          prize_wallet?: string | null
          rules?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
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
      search_profiles: {
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
