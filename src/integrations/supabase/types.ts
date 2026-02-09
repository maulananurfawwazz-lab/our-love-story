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
      chat_messages: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          start_date?: string | null
        }
        Relationships: []
      }
      emotions: {
        Row: {
          couple_id: string
          created_at: string
          date: string
          emotion_type: string
          id: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          date?: string
          emotion_type: string
          id?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          date?: string
          emotion_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      finances: {
        Row: {
          amount: number
          category: string
          couple_id: string
          created_at: string
          date: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          couple_id: string
          created_at?: string
          date?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          couple_id?: string
          created_at?: string
          date?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finances_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      future_goals: {
        Row: {
          couple_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          target_date: string | null
          title: string
          type: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          target_date?: string | null
          title: string
          type: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          target_date?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          image_url: string | null
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          category: string
          couple_id: string
          created_at: string
          created_by: string
          id: string
          spotify_url: string
          title: string
        }
        Insert: {
          category?: string
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          spotify_url: string
          title: string
        }
        Update: {
          category?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          spotify_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          couple_id: string
          created_at: string
          hobbies: string[] | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          couple_id: string
          created_at?: string
          hobbies?: string[] | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          couple_id?: string
          created_at?: string
          hobbies?: string[] | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      promises: {
        Row: {
          content: string
          couple_id: string
          created_at: string
          created_by: string
          id: string
          is_private: boolean
        }
        Insert: {
          content: string
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          is_private?: boolean
        }
        Update: {
          content?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_private?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "promises_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      surprises: {
        Row: {
          category: string | null
          couple_id: string
          created_at: string
          created_by: string
          id: string
          is_locked: boolean
          message: string
          open_date: string | null
        }
        Insert: {
          category?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          is_locked?: boolean
          message: string
          open_date?: string | null
        }
        Update: {
          category?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_locked?: boolean
          message?: string
          open_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surprises_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          couple_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_couple_id: { Args: { _user_id: string }; Returns: string }
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
