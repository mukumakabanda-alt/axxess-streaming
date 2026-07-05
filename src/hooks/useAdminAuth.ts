import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async (uid: string | null) => {
      if (!uid) {
        if (!cancelled) {
          setUserId(null);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (cancelled) return;
      setUserId(uid);
      setIsAdmin(!error && data === true);
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      check(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoading(true);
      check(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { loading, isAdmin, userId, signOut };
}
