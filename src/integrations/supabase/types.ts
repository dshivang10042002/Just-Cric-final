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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      balls: {
        Row: {
          ball_in_over: number
          ball_index: number
          batter_id: string | null
          batter_name: string | null
          bowler_id: string | null
          bowler_name: string | null
          commentary: string | null
          created_at: string
          dismissed_player: string | null
          dismissed_player_id: string | null
          extra_type: string | null
          id: string
          innings_id: string
          is_wicket: boolean
          non_striker_id: string | null
          over_number: number
          runs: number
          wicket_type: string | null
        }
        Insert: {
          ball_in_over: number
          ball_index: number
          batter_id?: string | null
          batter_name?: string | null
          bowler_id?: string | null
          bowler_name?: string | null
          commentary?: string | null
          created_at?: string
          dismissed_player?: string | null
          dismissed_player_id?: string | null
          extra_type?: string | null
          id?: string
          innings_id: string
          is_wicket?: boolean
          non_striker_id?: string | null
          over_number: number
          runs?: number
          wicket_type?: string | null
        }
        Update: {
          ball_in_over?: number
          ball_index?: number
          batter_id?: string | null
          batter_name?: string | null
          bowler_id?: string | null
          bowler_name?: string | null
          commentary?: string | null
          created_at?: string
          dismissed_player?: string | null
          dismissed_player_id?: string | null
          extra_type?: string | null
          id?: string
          innings_id?: string
          is_wicket?: boolean
          non_striker_id?: string | null
          over_number?: number
          runs?: number
          wicket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balls_batter_id_fkey"
            columns: ["batter_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_dismissed_player_id_fkey"
            columns: ["dismissed_player_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      innings: {
        Row: {
          balls: number
          batting_team_id: string
          bowler_id: string | null
          bowling_team_id: string
          completed: boolean
          created_at: string
          extras: number
          id: string
          innings_no: number
          match_id: string
          non_striker_id: string | null
          runs: number
          striker_id: string | null
          target: number | null
          updated_at: string
          wickets: number
        }
        Insert: {
          balls?: number
          batting_team_id: string
          bowler_id?: string | null
          bowling_team_id: string
          completed?: boolean
          created_at?: string
          extras?: number
          id?: string
          innings_no: number
          match_id: string
          non_striker_id?: string | null
          runs?: number
          striker_id?: string | null
          target?: number | null
          updated_at?: string
          wickets?: number
        }
        Update: {
          balls?: number
          batting_team_id?: string
          bowler_id?: string | null
          bowling_team_id?: string
          completed?: boolean
          created_at?: string
          extras?: number
          id?: string
          innings_no?: number
          match_id?: string
          non_striker_id?: string | null
          runs?: number
          striker_id?: string | null
          target?: number | null
          updated_at?: string
          wickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "innings_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_striker_id_fkey"
            columns: ["striker_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          current_innings: number
          id: string
          overs: number
          result_text: string | null
          started_at: string | null
          status: string
          team_a_id: string
          team_b_id: string
          toss_decision: string | null
          toss_winner_id: string | null
          tournament_id: string | null
          updated_at: string
          venue: string | null
          winner_team_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_innings?: number
          id?: string
          overs?: number
          result_text?: string | null
          started_at?: string | null
          status?: string
          team_a_id: string
          team_b_id: string
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_innings?: number
          id?: string
          overs?: number
          result_text?: string | null
          started_at?: string | null
          status?: string
          team_a_id?: string
          team_b_id?: string
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batting_style: string | null
          bowling_style: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_premium: boolean
          role: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          batting_style?: string | null
          bowling_style?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_premium?: boolean
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          batting_style?: string | null
          bowling_style?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          batting_style: string | null
          bowling_style: string | null
          created_at: string
          id: string
          jersey_number: number | null
          player_name: string
          profile_id: string | null
          role: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          batting_style?: string | null
          bowling_style?: string | null
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_name: string
          profile_id?: string | null
          role?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          batting_style?: string | null
          bowling_style?: string | null
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_name?: string
          profile_id?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          id: string
          jersey_color: string | null
          join_code: string
          logo_url: string | null
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          id?: string
          jersey_color?: string | null
          join_code?: string
          logo_url?: string | null
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          id?: string
          jersey_color?: string | null
          join_code?: string
          logo_url?: string | null
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tournament_teams: {
        Row: {
          created_at: string
          id: string
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string
          format: string
          id: string
          name: string
          overs_per_match: number
          short_name: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          format?: string
          id?: string
          name: string
          overs_per_match?: number
          short_name?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          format?: string
          id?: string
          name?: string
          overs_per_match?: number
          short_name?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_team_with_code: {
        Args: {
          p_code: string
          p_jersey?: number
          p_player_name: string
          p_role?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
