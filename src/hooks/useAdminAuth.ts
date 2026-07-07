import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasTransientResultError, retryTransient } from "@/lib/retry";

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
      const { data, error } = await retryTransient(
        () => supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        }),
        { shouldRetryResult: hasTransientResultError },
      );
      if (cancelled) return;
      setUserId(uid);
      setIsAdmin(!error && data === true);
      setLoading(false);
    };

    retryTransient(() => supabase.auth.getUser(), { shouldRetryResult: hasTransientResultError })
      .then(({ data }) => {
        check(data.user?.id ?? null);
      })
      .catch(() => {
        check(null);
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
