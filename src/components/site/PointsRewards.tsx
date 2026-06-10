import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Check, Sparkles, Loader2, Zap, Users, Star } from "lucide-react";
import { REWARD_TIERS, recordRewardUnlocks } from "@/lib/rewards";
import { getUser } from "@/lib/customer";
import { showRewardUnlock } from "./RewardUnlockToast";

const REWARDS = REWARD_TIERS.map((r) => ({
  points: r.points,
  label: r.points === 50 ? "Unlock Premium Bundle" : r.label,
}));

const STORAGE_KEY = "axx_customer_phone";

// Tier identity — maps the 5 reward levels to visual identities
const TIER_META = [
  { name: "BRONZE",   color: "#cd7f32", glow: "rgba(205,127,50,0.4)"  },
  { name: "SILVER",   color: "#a8a9ad", glow: "rgba(168,169,173,0.4)" },
  { name: "GOLD",     color: "#C9A84C", glow: "rgba(201,168,76,0.5)"  },
  { name: "PLATINUM", color: "#e5e4e2", glow: "rgba(229,228,226,0.4)" },
  { name: "ELITE",    color: "#E5192A", glow: "rgba(229,25,42,0.55)"  },
];

function getTierIndex(points: number) {
  // Returns which tier the user currently occupies (0–4)
  let idx = -1;
  REWARD_TIERS.forEach((t, i) => { if (points >= t.points) idx = i; });
  return idx;
}

export function PointsRewards() {
  const [phone,        setPhone]        = useState("");
  const [loaded,       setLoaded]       = useState(false);
  const [points,       setPoints]       = useState(0);
  const [displayPct,   setDisplayPct]   = useState(0);
  const [name,         setName]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [celebrate,    setCelebrate]    = useState(false);
  const [burstKey,     setBurstKey]     = useState(0);
  const prevPointsRef  = useRef<number | null>(null);
  const barRef         = useRef<HTMLDivElement>(null);

  // Animated point counter
  const [displayPoints, setDisplayPoints] = useState(0);
  useEffect(() => {
    if (points === displayPoints) return;
    const start = displayPoints;
    const diff  = points - start;
    const t0    = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t     = Math.min(1, (now - t0) / 1800);
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
    const prev      = prevPointsRef.current;
    setPoints(newPoints);
    setName(data?.customer_name ?? "");
    setLoaded(true);
    setLoading(false);
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
    setPhone(""); setLoaded(false); setPoints(0); setName("");
    prevPointsRef.current = null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u      = getUser();
    const stored = u?.whatsapp || localStorage.getItem(STORAGE_KEY);
    if (stored) { setPhone(stored); lookup(stored); }
  }, []);

  const maxPoints = 100;
  const pct       = Math.min(100, (points / maxPoints) * 100);

  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(pct), 120);
    if (prevPointsRef.current !== null && points > prevPointsRef.current) {
      setCelebrate(true);
      setBurstKey((k) => k + 1);
      const c = setTimeout(() => setCelebrate(false), 2600);
      prevPointsRef.current = points;
      return () => { clearTimeout(t); clearTimeout(c); };
    }
    prevPointsRef.current = points;
    return () => clearTimeout(t);
  }, [points, pct]);

  useEffect(() => {
    if (!loaded || !phone) return;
    const interval = setInterval(() => lookup(phone), 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, phone]);

  const tierIdx        = getTierIndex(points);
  const activeTier     = tierIdx >= 0 ? TIER_META[tierIdx] : null;
  const nextTier       = tierIdx < TIER_META.length - 1 ? TIER_META[tierIdx + 1] : null;
  const nextTierPts    = tierIdx < REWARD_TIERS.length - 1 ? REWARD_TIERS[tierIdx + 1]?.points : 100;
  const allAccessUnlocked = points >= 50;

  return (
    <section id="rewards" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Star className="h-3.5 w-3.5" /> Rewards Program
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Every subscription earns you more
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Subscribe, refer, review — climb the tiers and unlock real perks.
          </p>
        </div>

        {/* ── Earn-rate cards ─────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: <Zap  className="h-4 w-4" />, pts: "+5 pts", action: "Per subscription"  },
            { icon: <Users className="h-4 w-4" />, pts: "+10 pts", action: "Per referral"     },
            { icon: <Star  className="h-4 w-4" />, pts: "+5 pts",  action: "Per review left"  },
          ].map(({ icon, pts, action }) => (
            <div
              key={action}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 text-center"
              style={{ background: "linear-gradient(160deg, rgba(229,25,42,0.06), transparent 70%)" }}
            >
              <span className="text-primary">{icon}</span>
              <span className="font-display text-lg font-bold text-primary">{pts}</span>
              <span className="text-xs text-muted-foreground leading-tight">{action}</span>
            </div>
          ))}
        </div>

        {/* ── Main dashboard card ─────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-3xl border border-border shadow-elegant overflow-hidden"
          style={{ background: "linear-gradient(160deg, rgba(22,10,12,1) 0%, rgba(14,14,18,1) 100%)" }}
        >
          {!loaded ? (
            /* ── Phone lookup ────────────────────────────────────────────── */
            <div className="p-8 sm:p-12">
              <div className="mx-auto max-w-sm text-center">
                <div
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "rgba(229,25,42,0.12)", border: "1px solid rgba(229,25,42,0.25)" }}
                >
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold">Check your points</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter your WhatsApp number to view your dashboard.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 text-left">
                  <Label htmlFor="rewards-phone" className="text-xs uppercase tracking-wider text-muted-foreground">
                    WhatsApp number
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="rewards-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+260 7XX XXX XXX"
                      required
                      maxLength={20}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 font-semibold text-white text-sm transition-all hover:bg-primary/90 disabled:opacity-60"
                      style={{ minWidth: 72, boxShadow: "0 0 24px -6px rgba(229,25,42,0.6)" }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Same number used when you ordered.
                  </p>
                </form>
              </div>
            </div>
          ) : (
            /* ── Dashboard ───────────────────────────────────────────────── */
            <div className="relative overflow-hidden">

              {/* Celebration burst */}
              {celebrate && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <span
                      key={`c-${burstKey}-${i}`}
                      className="absolute h-2.5 w-1.5 rounded-sm animate-confetti"
                      style={{
                        left: `${3 + i * 3.2}%`,
                        background: ["#E5192A","#C9A84C","#ffffff","#f59e0b","#10b981","#a855f7"][i % 6],
                        animationDelay: `${i * 32}ms`,
                      }}
                    />
                  ))}
                  <span key={`r1-${burstKey}`}
                    className="absolute left-1/2 top-16 -translate-x-1/2 h-28 w-28 rounded-full border-2 border-primary/60 animate-burst-ring" />
                  <span key={`r2-${burstKey}`}
                    className="absolute left-1/2 top-16 -translate-x-1/2 h-28 w-28 rounded-full border border-primary/30 animate-burst-ring"
                    style={{ animationDelay: "200ms" }} />
                </div>
              )}

              {/* ── Top: identity bar ──────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-6 py-4 sm:px-10 border-b border-border"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center gap-3">
                  {/* Tier badge */}
                  {activeTier ? (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black tracking-widest"
                      style={{
                        background: `radial-gradient(circle, ${activeTier.color}33, transparent)`,
                        border:     `1.5px solid ${activeTier.color}`,
                        color:       activeTier.color,
                        boxShadow:  `0 0 16px -4px ${activeTier.glow}`,
                        fontSize:   "0.55rem",
                      }}
                    >
                      {activeTier.name.slice(0, 2)}
                    </div>
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-display text-sm font-bold">
                      {name || "Member"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeTier ? (
                        <span style={{ color: activeTier.color }}>{activeTier.name} tier</span>
                      ) : "No tier yet"}
                      {nextTier && ` · ${nextTierPts! - points} pts to ${nextTier.name}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Switch
                </button>
              </div>

              {/* ── Points display ─────────────────────────────────────── */}
              <div className="px-6 pt-10 pb-6 sm:px-10 text-center relative">
                {/* Ambient glow behind points number */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 h-32 w-32 rounded-full opacity-30"
                  style={{ background: "radial-gradient(circle, rgba(229,25,42,0.5), transparent 70%)", filter: "blur(24px)" }}
                />
                <p className="relative text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Your points
                </p>
                <p
                  key={`pts-${points}`}
                  className={`relative font-display font-black leading-none text-gradient-red ${celebrate ? "animate-points-pop" : ""}`}
                  style={{ fontSize: "clamp(4rem, 12vw, 7rem)" }}
                >
                  {displayPoints}
                </p>
                <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">points</p>
              </div>

              {/* ── Progress bar ───────────────────────────────────────── */}
              <div className="px-6 pb-6 sm:px-10" ref={barRef}>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>0</span>
                  <span className="text-primary font-medium">
                    {points >= 100 ? "🏆 Max tier!" : `${100 - points} pts to free month`}
                  </span>
                  <span>100</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div
                    className="relative h-full overflow-hidden rounded-full transition-all duration-[1600ms] ease-[cubic-bezier(.34,1.56,.64,1)]"
                    style={{
                      width: `${displayPct}%`,
                      background: "linear-gradient(90deg, #E5192A, #ff4d4d, #C9A84C)",
                      boxShadow:  "0 0 16px -2px rgba(229,25,42,0.7)",
                    }}
                  >
                    <div className="absolute inset-0 bar-shimmer" />
                  </div>
                </div>

                {/* Tier tick marks */}
                <div className="relative mt-1 h-4">
                  {REWARD_TIERS.map((t) => {
                    const leftPct = (t.points / 100) * 100;
                    const unlocked = points >= t.points;
                    return (
                      <div
                        key={t.points}
                        className="absolute top-0 flex flex-col items-center"
                        style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
                      >
                        <div
                          className="h-2 w-0.5 rounded-full"
                          style={{ background: unlocked ? "#C9A84C" : "rgba(255,255,255,0.2)" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Tier ladder ────────────────────────────────────────── */}
              <div className="px-6 pb-6 sm:px-10">
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Rewards ladder</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REWARDS.map((r, i) => {
                    const unlocked = points >= r.points;
                    const meta     = TIER_META[i];
                    return (
                      <div
                        key={r.points}
                        className="flex items-center gap-3 rounded-2xl p-4 transition-all duration-300"
                        style={{
                          border:     unlocked ? `1px solid ${meta.color}55` : "1px solid rgba(255,255,255,0.07)",
                          background: unlocked ? `${meta.color}0d`            : "rgba(255,255,255,0.02)",
                          opacity:    unlocked ? 1 : 0.55,
                        }}
                      >
                        {/* Tier icon */}
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-black"
                          style={{
                            background: unlocked ? `${meta.color}22` : "rgba(255,255,255,0.05)",
                            border:     `1.5px solid ${unlocked ? meta.color : "rgba(255,255,255,0.1)"}`,
                            color:      unlocked ? meta.color         : "rgba(255,255,255,0.3)",
                            boxShadow:  unlocked ? `0 0 12px -4px ${meta.glow}` : "none",
                          }}
                        >
                          {unlocked
                            ? <Check className="h-4 w-4" />
                            : <Lock  className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-display text-xs font-bold uppercase tracking-wider"
                              style={{ color: unlocked ? meta.color : "rgba(255,255,255,0.4)", fontSize: "0.62rem" }}
                            >
                              {meta.name}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {r.points} pts
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Premium Bundle unlock card ─────────────────────────── */}
              <div className="px-6 pb-10 sm:px-10">
                <div
                  className="rounded-2xl p-5 sm:p-6 transition-all duration-500"
                  style={{
                    border:     allAccessUnlocked ? "1.5px solid rgba(229,25,42,0.5)" : "1.5px dashed rgba(255,255,255,0.1)",
                    background: allAccessUnlocked
                      ? "linear-gradient(135deg, rgba(229,25,42,0.12), rgba(201,168,76,0.06))"
                      : "rgba(255,255,255,0.02)",
                    boxShadow:  allAccessUnlocked ? "0 0 40px -12px rgba(229,25,42,0.4)" : "none",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        background: allAccessUnlocked ? "rgba(229,25,42,0.2)" : "rgba(255,255,255,0.05)",
                        border:     allAccessUnlocked ? "1px solid rgba(229,25,42,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {allAccessUnlocked
                        ? <Sparkles className="h-6 w-6 text-primary" />
                        : <Lock     className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-display text-base font-bold">Premium Bundle</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {allAccessUnlocked
                          ? "🎉 Unlocked! Message us on WhatsApp to claim your Premium Bundle (HBO Max · Disney+ · Hulu)."
                          : `${50 - points} more points unlocks HBO Max · Disney+ · Hulu for free.`}
                      </p>
                      {allAccessUnlocked && (
                        <a
                          href="https://wa.me/260770514809?text=Hi!%20I've%20unlocked%20the%20Premium%20Bundle%20with%20my%20reward%20points."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                          style={{ boxShadow: "0 0 24px -6px rgba(229,25,42,0.7)" }}
                        >
                          Claim on WhatsApp →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
          }
