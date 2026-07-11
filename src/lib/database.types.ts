export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "user" | "admin";
export type SubscriptionPlan = "gratis" | "pro" | "business";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired";
export type PaymentProvider = "manual" | "stripe" | "mercado_pago" | "kirvano";
export type BillingEventProvider = Exclude<PaymentProvider, "manual">;
export type BillingEventStatus = "received" | "processed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          business_name: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          business_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          business_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      lots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          supplier: string;
          date: string;
          input_weight_kg: number;
          cost_per_kg: number;
          total_cost: number;
          desired_margin_percent: number;
          notes: string;
          cuts: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          supplier?: string;
          date: string;
          input_weight_kg: number;
          cost_per_kg: number;
          total_cost: number;
          desired_margin_percent: number;
          notes?: string;
          cuts: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          supplier?: string;
          date?: string;
          input_weight_kg?: number;
          cost_per_kg?: number;
          total_cost?: number;
          desired_margin_percent?: number;
          notes?: string;
          cuts?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          lots_limit: number;
          provider: PaymentProvider;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          started_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          lots_limit?: number;
          provider?: PaymentProvider;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          lots_limit?: number;
          provider?: PaymentProvider;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          user_id: string | null;
          provider: BillingEventProvider;
          provider_event_id: string;
          event_type: string;
          payload: Json;
          status: BillingEventStatus;
          error_message: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          provider: BillingEventProvider;
          provider_event_id: string;
          event_type: string;
          payload?: Json;
          status?: BillingEventStatus;
          error_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          provider?: BillingEventProvider;
          provider_event_id?: string;
          event_type?: string;
          payload?: Json;
          status?: BillingEventStatus;
          error_message?: string | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      billing_products: {
        Row: {
          id: string;
          provider: "kirvano";
          provider_product_id: string;
          plan: SubscriptionPlan;
          lots_limit: number;
          access_days: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider?: "kirvano";
          provider_product_id: string;
          plan: SubscriptionPlan;
          lots_limit?: number;
          access_days?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider?: "kirvano";
          provider_product_id?: string;
          plan?: SubscriptionPlan;
          lots_limit?: number;
          access_days?: number | null;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_access_grants: {
        Row: {
          id: string;
          provider: "kirvano";
          provider_sale_id: string;
          provider_product_id: string;
          email: string;
          user_id: string | null;
          plan: SubscriptionPlan;
          lots_limit: number;
          expires_at: string | null;
          status: "pending" | "granted" | "revoked";
          granted_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider?: "kirvano";
          provider_sale_id: string;
          provider_product_id: string;
          email: string;
          user_id?: string | null;
          plan: SubscriptionPlan;
          lots_limit: number;
          expires_at?: string | null;
          status?: "pending" | "granted" | "revoked";
          granted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          plan?: SubscriptionPlan;
          lots_limit?: number;
          expires_at?: string | null;
          status?: "pending" | "granted" | "revoked";
          granted_at?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
