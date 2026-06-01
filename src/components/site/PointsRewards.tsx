import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Lock, Check, Sparkles, Loader2 } from "lucide-react";
import { REWARD_TIERS, recordRewardUnlocks } from "@/lib/rewards";
import { getUser } from "@/lib/customer";
import { showRewardUnlock } from "./RewardUnlockToast";

const REWARDS = REWARD_TIERS.map((r) => ({
  points: r.points,
  label: r.points === 50 ? "Unlock Premium Bundle" : r.label,
}));

const STORAGE_KEY = "axx_customer_phone";

export function PointsRewards() {
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const prevPointsRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = getUser();
    const stored = u?.whatsapp || localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPhone(stored);
      lookup(stored);
    }
  }, []);

  // Animated count-up for points display
  const [displayPoints, setDisplayPoints] = useState(0);
  useEffect(() => {
    if (points === displayPoints) return;
    const start = displayPoints;
    const diff = points - start;
    const duration = 1800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPoints(Math.round(start + diff * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const lookup = async (p: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_points")
      .select("points,customer_name")
      .eq("customer_phone", p.trim())
      .maybeSingle();
    const newPoints = data?.points ?? 0;
    const prev = prevPointsRef.current;
    setPoints(newPoints);
    setName(data?.customer_name ?? "");
    setLoaded(true);
    setLoading(false);

    // If points went up while user is on the page, check for tier unlocks
    if (prev !== null && newPoints > prev) {
      const unlocks = await recordRewardUnlocks(p.trim(), data?.customer_name ?? null, prev, newPoints);
      unlocks.forEach((u) => showRewardUnlock(u.points, u.label));
    }
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
    prevPointsRef.current = null;
  };

  const maxPoints = 100;
  const pct = Math.min(100, (points / maxPoints) * 100);

  // Animate bar + celebrate when points increase
  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(pct), 80);
    if (prevPointsRef.current !== null && points > prevPointsRef.current) {
      setCelebrate(true);
      setBurstKey((k) => k + 1);
      const c = setTimeout(() => setCelebrate(false), 2400);
      prevPointsRef.current = points;
      return () => { clearTimeout(t); clearTimeout(c); };
    }
    prevPointsRef.current = points;
    return () => clearTimeout(t);
  }, [points, pct]);

  // Poll for point updates while loaded (catches new points earned in same session)
  useEffect(() => {
    if (!loaded || !phone) return;
    const interval = setInterval(() => lookup(phone), 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, phone]);

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
            <div className="relative">
              {celebrate && (
                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                  {/* Confetti rain */}
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={`c-${burstKey}-${i}`}
                      className="absolute h-2.5 w-1.5 rounded-sm animate-confetti"
                      style={{
                        left: `${4 + i * 3.4}%`,
                        background: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"][i % 6],
                        animationDelay: `${i * 35}ms`,
                      }}
                    />
                  ))}
                  {/* Radial burst rings around the points number */}
                  <span
                    key={`r1-${burstKey}`}
                    className="absolute left-1/2 top-12 -translate-x-1/2 h-24 w-24 rounded-full border-2 border-primary/70 animate-burst-ring"
                  />
                  <span
                    key={`r2-${burstKey}`}
                    className="absolute left-1/2 top-12 -translate-x-1/2 h-24 w-24 rounded-full border border-primary/40 animate-burst-ring"
                    style={{ animationDelay: "180ms" }}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {name ? `Hi, ${name} 👋` : phone}
                  </p>
                  <p
                    key={`pts-${points}`}
                    className={`mt-1 font-display text-6xl font-bold text-gradient-red ${celebrate ? "animate-points-pop" : ""}`}
                  >
                    {displayPoints} <span className="text-2xl text-muted-foreground">pts</span>
                  </p>
                </div>
                <button onClick={reset} className="text-xs font-semibold text-muted-foreground hover:text-primary">
                  Switch number
                </button>
              </div>

              {/* Progress bar with shimmer */}
              <div className="mt-6">
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary border border-border">
                  <div
                    className="relative h-full overflow-hidden bg-gradient-to-r from-primary via-primary-glow to-primary shadow-glow-red transition-all duration-[1400ms] ease-[cubic-bezier(.34,1.56,.64,1)]"
                    style={{ width: `${displayPct}%` }}
                  >
                    <div className="absolute inset-0 bar-shimmer" />
                  </div>
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
                    <p className="font-display text-lg font-bold">Premium Bundle</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {allAccessUnlocked
                        ? "🎉 Unlocked! Contact us on WhatsApp to claim your Premium Bundle (HBO Max · Disney+ · Hulu)."
                        : `Earn ${50 - points} more points to unlock the Premium Bundle (HBO Max · Disney+ · Hulu).`}
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
