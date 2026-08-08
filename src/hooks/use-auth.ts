import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLanchonete, setIsLanchonete] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      const nextUser = s?.user ?? null;
      setSession(s);
      setUser(nextUser);
      setRolesLoading(!!nextUser);
    });
    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setSession(data.session);
      setUser(nextUser);
      setRolesLoading(!!nextUser);
      setSessionLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsLanchonete(false);
      setRolesLoading(false);
      return;
    }
    let cancelled = false;
    setRolesLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        
        // If there's a network error, don't clear roles, keep existing state
        if (error && error.message?.includes('fetch')) {
          console.warn("[Auth] Network error while fetching roles, keeping current state");
          setRolesLoading(false);
          return;
        }

        const roles = (data ?? []).map((r) => r.role);
        setIsAdmin(roles.includes("admin"));
        setIsLanchonete(roles.includes("lanchonete"));
        setRolesLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const isStaff = isAdmin || isLanchonete;
  const loading = sessionLoading || rolesLoading;
  return { session, user, isAdmin, isLanchonete, isStaff, loading };
}
