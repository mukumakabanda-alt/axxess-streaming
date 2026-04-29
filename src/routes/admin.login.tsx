import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const auth = useAdminAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  // Check whether ANY admin exists. If not, allow first-time signup.
  useEffect(() => {
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin")
      .then(({ count }) => setHasAdmin((count ?? 0) > 0));
  }, []);

  useEffect(() => {
    if (auth.isAuthed && auth.isAdmin) navigate({ to: "/admin" });
  }, [auth, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    if (mode === "signup") {
      if (hasAdmin) {
        toast.error("Signup is disabled. Contact the existing admin.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      // Promote to admin (first user only)
      if (data.user) {
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
      }
      toast.success("Admin account created. You're in!");
      navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Welcome back!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2 self-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow-red">
            <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold">Axxess<span className="text-primary">.</span></span>
        </Link>

        <div className="rounded-3xl border border-border gradient-card p-8 shadow-elegant">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-bold">
            {mode === "signup" ? "Create admin account" : "Admin sign in"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {hasAdmin === false && mode === "login"
              ? "No admin yet — switch to Sign up to create the first one."
              : "Access the Axxess Streaming dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create Admin" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              hasAdmin === false ? (
                <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                  Create the first admin account
                </button>
              ) : null
            ) : (
              <button onClick={() => setMode("login")} className="text-primary hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <Link to="/" className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to website
        </Link>
      </div>
    </div>
  );
}
