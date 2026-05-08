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
      cron_budget: {
        Row: {
          date: string
          est_cost_usd: number
          gemini_calls: number
          halt_reason: string | null
          halted: boolean
          reddit_calls: number
        }
        Insert: {
          date: string
          est_cost_usd?: number
          gemini_calls?: number
          halt_reason?: string | null
          halted?: boolean
          reddit_calls?: number
        }
        Update: {
          date?: string
          est_cost_usd?: number
          gemini_calls?: number
          halt_reason?: string | null
          halted?: boolean
          reddit_calls?: number
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          candidates: number | null
          error: string | null
          finished_at: string | null
          id: string
          job_name: string
          publishes: number | null
          rejects: number | null
          started_at: string
        }
        Insert: {
          candidates?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          publishes?: number | null
          rejects?: number | null
          started_at?: string
        }
        Update: {
          candidates?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          publishes?: number | null
          rejects?: number | null
          started_at?: string
        }
        Relationships: []
      }
      daily_run_totals: {
        Row: {
          completed_at: string
          daily_room_id: string
          player_id: string
          total_score: number
        }
        Insert: {
          completed_at?: string
          daily_room_id: string
          player_id: string
          total_score: number
        }
        Update: {
          completed_at?: string
          daily_room_id?: string
          player_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_run_totals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_player_id: string | null
          current_round_id: string | null
          current_round_state: string
          id: string
          mode: string
          room_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_player_id?: string | null
          current_round_id?: string | null
          current_round_state?: string
          id?: string
          mode: string
          room_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_player_id?: string | null
          current_round_id?: string | null
          current_round_state?: string
          id?: string
          mode?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_creator_player_id_fkey"
            columns: ["creator_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_current_round_id_fkey"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_embedding_cache: {
        Row: {
          created_at: string
          embedding: string
          hit_count: number
          normalized_text: string
        }
        Insert: {
          created_at?: string
          embedding: string
          hit_count?: number
          normalized_text: string
        }
        Update: {
          created_at?: string
          embedding?: string
          hit_count?: number
          normalized_text?: string
        }
        Relationships: []
      }
      guesses: {
        Row: {
          guess_text: string
          id: string
          player_id: string
          round_id: string
          score: number
          score_breakdown: Json
          session_id: string
          submitted_at: string
        }
        Insert: {
          guess_text: string
          id?: string
          player_id: string
          round_id: string
          score: number
          score_breakdown: Json
          session_id: string
          submitted_at?: string
        }
        Update: {
          guess_text?: string
          id?: string
          player_id?: string
          round_id?: string
          score?: number
          score_breakdown?: Json
          session_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guesses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guesses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guesses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          last_seen_at: string
          nickname: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          nickname: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          nickname?: string
        }
        Relationships: []
      }
      round_reports: {
        Row: {
          player_id: string
          reason: string | null
          reported_at: string
          round_id: string
        }
        Insert: {
          player_id: string
          reason?: string | null
          reported_at?: string
          round_id: string
        }
        Update: {
          player_id?: string
          reason?: string | null
          reported_at?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_reports_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          comment_embedding: string | null
          difficulty: string
          fetched_at: string
          gate_reasoning: string | null
          gate_verdict: string
          id: string
          joke_structure: string | null
          key_noun: string | null
          post_score: number
          post_url: string
          published_at: string | null
          punchline_word: string | null
          reddit_data: Json | null
          reddit_post_id: string
          report_count: number
          status: string
          subreddit: string
          title: string
          top_comment_score: number
          top_comment_text: string
        }
        Insert: {
          comment_embedding?: string | null
          difficulty: string
          fetched_at?: string
          gate_reasoning?: string | null
          gate_verdict: string
          id?: string
          joke_structure?: string | null
          key_noun?: string | null
          post_score: number
          post_url: string
          published_at?: string | null
          punchline_word?: string | null
          reddit_data?: Json | null
          reddit_post_id: string
          report_count?: number
          status?: string
          subreddit: string
          title: string
          top_comment_score: number
          top_comment_text: string
        }
        Update: {
          comment_embedding?: string | null
          difficulty?: string
          fetched_at?: string
          gate_reasoning?: string | null
          gate_verdict?: string
          id?: string
          joke_structure?: string | null
          key_noun?: string | null
          post_score?: number
          post_url?: string
          published_at?: string | null
          punchline_word?: string | null
          reddit_data?: Json | null
          reddit_post_id?: string
          report_count?: number
          status?: string
          subreddit?: string
          title?: string
          top_comment_score?: number
          top_comment_text?: string
        }
        Relationships: []
      }
      session_rounds: {
        Row: {
          round_id: string
          round_index: number
          session_id: string
        }
        Insert: {
          round_id: string
          round_index: number
          session_id: string
        }
        Update: {
          round_id?: string
          round_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rounds_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
