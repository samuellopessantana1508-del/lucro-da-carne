"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  businessName?: string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  accountError: string | null;
  refreshAccount: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const loadAccount = useCallback(
    async (userId: string | null) => {
      if (!supabase || !userId) {
        setProfile(null);
        setSubscription(null);
        setAccountError(null);
        return;
      }

      const [profileResult, subscriptionResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      setProfile(profileResult.data);
      setSubscription(subscriptionResult.data);
      setAccountError(null);
    },
    [supabase]
  );

  const refreshAccount = useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    setSession(data.session);
    setUser(data.session?.user ?? null);
    await loadAccount(data.session?.user.id ?? null);
  }, [loadAccount, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    let active = true;

    async function boot() {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!active) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);
        await loadAccount(data.session?.user.id ?? null);
      } catch (error) {
        if (active) {
          setAccountError(error instanceof Error ? error.message : "Falha ao carregar a conta.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void boot();

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void loadAccount(nextSession?.user.id ?? null);
    });

    return () => {
      active = false;
      authSubscription.unsubscribe();
    };
  }, [loadAccount, supabase]);

  useEffect(() => {
    if (!supabase || !user?.id) return;

    const client = supabase;
    const userId = user.id;
    const refreshSubscription = () => {
      void loadAccount(userId).catch((error) => {
        setAccountError(error instanceof Error ? error.message : "Falha ao atualizar a assinatura.");
      });
    };
    const channel = client
      .channel(`subscription-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        refreshSubscription
      )
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshSubscription();
    };

    window.addEventListener("focus", refreshSubscription);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshSubscription);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void client.removeChannel(channel);
    };
  }, [loadAccount, supabase, user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Configure o Supabase para entrar.");

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshAccount();
    },
    [refreshAccount, supabase]
  );

  const signUp = useCallback(
    async ({ email, password, name, businessName }: SignUpInput) => {
      if (!supabase) throw new Error("Configure o Supabase para criar contas.");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name,
            business_name: businessName ?? "",
          },
        },
      });

      if (error) throw error;

      if (data.session && businessName) {
        await supabase
          .from("profiles")
          .update({ business_name: businessName })
          .eq("id", data.session.user.id);
      }

      await refreshAccount();
      return { needsEmailConfirmation: Boolean(data.user && !data.session) };
    },
    [refreshAccount, supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;

    setSession(null);
    setUser(null);
    setProfile(null);
    setSubscription(null);
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error("Configure o Supabase para redefinir a senha.");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/definir-senha`,
      });
      if (error) throw error;
    },
    [supabase]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      session,
      profile,
      subscription,
      accountError,
      refreshAccount,
      signIn,
      signUp,
      resetPassword,
      signOut,
    }),
    [
      accountError,
      configured,
      loading,
      profile,
      refreshAccount,
      resetPassword,
      session,
      signIn,
      signOut,
      signUp,
      subscription,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return value;
}
