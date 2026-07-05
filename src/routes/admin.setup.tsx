import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/setup")({
  head: () => ({
    meta: [
      { title: "Admin setup — Axxess" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      setAdminExists(!error && data === true);
      setChecking(false);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    // 1. Sign up (auto-confirm is on, so we get a session immediately).
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (signUpErr) {
      setBusy(false);
      setErr(signUpErr.message);
      return;
    }

    // 2. If the account already existed but is not the admin, sign in first.
    let { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setBusy(false);
        setErr(signInErr.message);
        return;
      }
      ({ data: userData } = await supabase.auth.getUser());
    }
    if (!userData.user) {
      setBusy(false);
      setErr("Could not establish a session. Try again.");
      return;
    }

    // 3. Claim the admin role (only works if no admin exists yet).
    const { data: claimed, error: claimErr } = await supabase.rpc(
      "claim_first_admin"
    );
    if (claimErr || claimed !== true) {
      // Someone else already claimed it, or the RPC refused.
      await supabase.auth.signOut();
      setBusy(false);
      setAdminExists(true);
      setErr(
        "An admin already exists. Use the sign-in page instead."
      );
      return;
    }

    setBusy(false);
    setDone(true);
    setTimeout(() => nav({ to: "/admin" }), 1200);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-foreground">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-[#0c0c0c] p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A" }}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">Admin setup</h1>
            <p className="text-xs text-muted-foreground">
              One-time bootstrap for the admin dashboard.
            </p>
          </div>
        </div>

        {adminExists ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold">Setup is closed.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                An admin account has already been created. If you're the admin,
                sign in below.
              </p>
            </div>
            <Link
              to="/admin/login"
              className="block w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold text-white"
              style={{ background: "#E5192A" }}
            >
              Go to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" /> Admin account created
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Redirecting to the dashboard…
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              This form works exactly once. The first credentials you submit
              become the admin. Store them somewhere safe.
            </p>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Email
              </span>
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
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[10px] text-muted-foreground">
                At least 8 characters. Avoid common/leaked passwords.
              </span>
            </label>

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
              Create admin account
            </button>

            <Link
              to="/admin/login"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Already set up? Sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
