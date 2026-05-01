import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Lock, Check, Sparkles, Loader2 } from "lucide-react";

const REWARDS = [
  { points: 5, label: "+2 days bonus" },
  { points: 15, label: "Loyalty Gold Badge" },
  { points: 30, label: "K5 off next subscription" },
  { points: 50, label: "Unlock All-Access bundle" },
  { points: 100, label: "Free month" },
];

const STORAGE_KEY = "axx_customer_phone";

export function PointsRewards() {
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      setPhone(stored);
      lookup(stored);
    }
  }, []);

  const lookup = async (p: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_points")
      .select("points,customer_name")
      .eq("customer_phone", p.trim())
      .maybeSingle();
    setPoints(data?.points ?? 0);
    setName(data?.customer_name ?? "");
    setLoaded(true);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 6) return;
    localStorage.setItem(STORAGE_KEY, phone.trim());
    lookup(phone.trim());
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPhone("");
    setLoaded(false);
    setPoints(0);
    setName("");
  };

  const maxPoints = 100;
  const pct = Math.min(100, (points / maxPoints) * 100);
  const allAccessUnlocked = points >= 50;

  return (
    <section id="rewards" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Award className="h-3.5 w-3.5" /> Rewards
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Earn points, unlock perks</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Subscribe and refer friends to climb the rewards ladder.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-10">
          {!loaded ? (
            <form onSubmit={handleSubmit} className="mx-auto max-w-md">
              <Label htmlFor="rewards-phone">Enter your WhatsApp number to view your points</Label>
              <div className="mt-3 flex gap-2">
                <Input
                  id="rewards-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+260 ..."
                  required
                  maxLength={20}
                />
                <Button type="submit" disabled={loading} className="rounded-md bg-primary px-6 font-semibold hover:bg-primary/90">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Use the same WhatsApp number you used to order or refer friends.
              </p>
            </form>
          ) : (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {name ? `Hi, ${name}` : phone}
                  </p>
                  <p className="mt-1 font-display text-5xl font-bold text-gradient-red">
                    {points} <span className="text-2xl text-muted-foreground">pts</span>
                  </p>
                </div>
                <button onClick={reset} className="text-xs font-semibold text-muted-foreground hover:text-primary">
                  Switch number
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow shadow-glow-red transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {points >= 100 ? "🏆 Max tier reached!" : `${100 - points} pts to free month`}
                </p>
              </div>

              {/* Rewards ladder */}
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {REWARDS.map((r) => {
                  const unlocked = points >= r.points;
                  return (
                    <li
                      key={r.points}
                      className={`flex items-center gap-3 rounded-2xl border p-4 transition-smooth ${
                        unlocked
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-secondary opacity-70"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          unlocked ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                        }`}
                      >
                        {unlocked ? <Check className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-sm font-bold">{r.points} pts</p>
                        <p className="text-xs text-muted-foreground">{r.label}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* All-Access locked card */}
              <div
                className={`mt-6 rounded-2xl border-2 p-6 ${
                  allAccessUnlocked
                    ? "border-primary bg-primary/10 neon-red-glow"
                    : "border-dashed border-border bg-secondary/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                      allAccessUnlocked ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    }`}
                  >
                    {allAccessUnlocked ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold">All-Access Bundle</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {allAccessUnlocked
                        ? "🎉 Unlocked! Contact us on WhatsApp to claim your All-Access bundle."
                        : `Earn ${50 - points} more points to unlock the All-Access bundle (Netflix + Spotify + Prime + Disney+).`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl border border-border bg-secondary p-4">
                  <p className="font-semibold">+5 pts</p>
                  <p className="text-xs text-muted-foreground">Each completed subscription</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary p-4">
                  <p className="font-semibold">+10 pts</p>
                  <p className="text-xs text-muted-foreground">Each friend you refer</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
