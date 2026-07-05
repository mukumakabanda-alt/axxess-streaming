import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Axxess" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const nav = useNavigate();
  const { loading, isAdmin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAdmin) nav({ to: "/admin" });
  }, [loading, isAdmin, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setBusy(false);
      setErr("Sign-in failed. Try again.");
      return;
    }
    const { data: roleOk } = await supabase.rpc("has_role", {
      _user_id: uid,
      _role: "admin",
    });
    if (roleOk !== true) {
      await supabase.auth.signOut();
      setBusy(false);
      setErr("This account is not an admin.");
      return;
    }
    nav({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-foreground">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-[#0c0c0c] p-6"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A" }}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">Admin sign in</h1>
            <p className="text-xs text-muted-foreground">
              Restricted area. Admins only.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        {err && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "#E5192A" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>

        <Link
          to="/admin/setup"
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          First time here? Create the admin account
        </Link>
      </form>
    </div>
  );
}
