import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminAuthState = {
  loading: boolean;
  isAuthed: boolean;
  isAdmin: boolean;
  email: string | null;
};

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    isAuthed: false,
    isAdmin: false,
    email: null,
  });

  useEffect(() => {
    let mounted = true;

    const check = async (session: any) => {
      if (!session?.user) {
        if (mounted) setState({ loading: false, isAuthed: false, isAdmin: false, email: null });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (mounted)
        setState({ loading: false, isAuthed: true, isAdmin, email: session.user.email ?? null });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // defer to avoid deadlock
      setTimeout(() => check(session), 0);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
