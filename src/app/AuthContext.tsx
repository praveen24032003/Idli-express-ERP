import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(!supabase);
  const [membership, setMembership] = useState<{
    userId: string;
    active: boolean;
    error: string | null;
  } | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (event === "INITIAL_SESSION") setInitialized(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;

    let cancelled = false;
    void supabase
      .from("staff_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle()
      .then(
        ({ data: membership, error }) => {
          if (cancelled) return;
          const allowed = !error && Boolean(membership);
          setMembership({
            userId,
            active: allowed,
            error: allowed
              ? null
              : error?.message ?? "This account is not enabled as active ERP staff. Ask an owner to add it to staff access.",
          });
        },
        (cause: unknown) => {
          if (cancelled) return;
          setMembership({
            userId,
            active: false,
            error: cause instanceof Error ? cause.message : "Could not verify ERP staff access.",
          });
        },
      );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const membershipIsCurrent = Boolean(userId && membership?.userId === userId);
  const activeStaff = membershipIsCurrent && Boolean(membership?.active);
  const accessError = membershipIsCurrent ? membership?.error ?? null : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading: !initialized || Boolean(userId && !membershipIsCurrent),
      configured: Boolean(supabase),
      activeStaff,
      accessError,
      signIn: async (email, password) => {
        if (!supabase) throw new Error("Supabase configuration is missing.");
        setMembership(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, initialized, userId, membershipIsCurrent, activeStaff, accessError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
