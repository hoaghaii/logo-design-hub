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
      applications: {
        Row: {
          cover_note: string | null
          created_at: string
          designer_id: string
          id: string
          job_id: string
          portfolio_ids: string[]
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          cover_note?: string | null
          created_at?: string
          designer_id: string
          id?: string
          job_id: string
          portfolio_ids?: string[]
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          cover_note?: string | null
          created_at?: string
          designer_id?: string
          id?: string
          job_id?: string
          portfolio_ids?: string[]
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_messages: {
        Row: {
          application_id: string
          content: string | null
          created_at: string
          id: string
          proposal_status: string | null
          proposed_deadline: string | null
          proposed_price: number | null
          sender_id: string
          type: string
        }
        Insert: {
          application_id: string
          content?: string | null
          created_at?: string
          id?: string
          proposal_status?: string | null
          proposed_deadline?: string | null
          proposed_price?: number | null
          sender_id: string
          type?: string
        }
        Update: {
          application_id?: string
          content?: string | null
          created_at?: string
          id?: string
          proposal_status?: string | null
          proposed_deadline?: string | null
          proposed_price?: number | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_requests: {
        Row: {
          application_id: string
          created_at: string
          id: string
          note: string | null
          proposed_by: string
          proposed_price: number
          status: Database["public"]["Enums"]["deal_status"]
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          proposed_by: string
          proposed_price: number
          status?: Database["public"]["Enums"]["deal_status"]
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          proposed_by?: string
          proposed_price?: number
          status?: Database["public"]["Enums"]["deal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_requests_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          file_url: string
          id: string
          is_locked: boolean
          order_id: string
          submitted_at: string
        }
        Insert: {
          file_url: string
          id?: string
          is_locked?: boolean
          order_id: string
          submitted_at?: string
        }
        Update: {
          file_url?: string
          id?: string
          is_locked?: boolean
          order_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget: number
          client_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }
        Insert: {
          budget: number
          client_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
        }
        Update: {
          budget?: number
          client_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          contract_address: string | null
          created_at: string
          deadline: string
          designer_id: string
          final_price: number
          id: string
          job_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          client_id: string
          contract_address?: string | null
          created_at?: string
          deadline: string
          designer_id: string
          final_price: number
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          client_id?: string
          contract_address?: string | null
          created_at?: string
          deadline?: string
          designer_id?: string
          final_price?: number
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          category: string | null
          created_at: string
          designer_id: string
          id: string
          image_url: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          designer_id: string
          id?: string
          image_url: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          designer_id?: string
          id?: string
          image_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          contract_address: string | null
          created_at: string
          from_user_id: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["tx_status"]
          to_user_id: string | null
          tx_hash: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount: number
          contract_address?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["tx_status"]
          to_user_id?: string | null
          tx_hash?: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount?: number
          contract_address?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["tx_status"]
          to_user_id?: string | null
          tx_hash?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          wallet_balance?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      auto_refund_expired_orders: { Args: never; Returns: number }
      escrow_lock: { Args: { p_order_id: string }; Returns: undefined }
      escrow_reject: { Args: { p_order_id: string }; Returns: undefined }
      escrow_release: { Args: { p_order_id: string }; Returns: undefined }
      is_deal_party: { Args: { app_id: string }; Returns: boolean }
      propose_contract: {
        Args: {
          p_application_id: string
          p_deadline: string
          p_final_price: number
        }
        Returns: string
      }
      respond_contract: {
        Args: { p_accept: boolean; p_order_id: string }
        Returns: undefined
      }
      submit_deliverable: {
        Args: { p_file_url: string; p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status: "pending" | "accepted" | "rejected"
      deal_status: "pending" | "accepted" | "countered" | "rejected"
      job_status: "open" | "in_progress" | "completed" | "cancelled"
      order_status:
        | "pending_escrow"
        | "active"
        | "submitted"
        | "completed"
        | "rejected"
        | "refunded"
        | "pending_acceptance"
        | "declined"
      tx_status: "pending" | "confirmed"
      tx_type: "escrow_lock" | "escrow_release" | "escrow_refund"
      user_role: "client" | "designer"
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
      application_status: ["pending", "accepted", "rejected"],
      deal_status: ["pending", "accepted", "countered", "rejected"],
      job_status: ["open", "in_progress", "completed", "cancelled"],
      order_status: [
        "pending_escrow",
        "active",
        "submitted",
        "completed",
        "rejected",
        "refunded",
        "pending_acceptance",
        "declined",
      ],
      tx_status: ["pending", "confirmed"],
      tx_type: ["escrow_lock", "escrow_release", "escrow_refund"],
      user_role: ["client", "designer"],
    },
  },
} as const
