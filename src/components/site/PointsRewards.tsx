import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Check, Sparkles, Loader2, Zap, Users, Star, Crown, MessageCircle } from "lucide-react";
import { REWARD_TIERS, recordRewardUnlocks } from "@/lib/rewards";
import { getUser } from "@/lib/customer";
import { showRewardUnlock } from "./RewardUnlockToast";

const STORAGE_KEY = "axx_customer_phone";
const WA = "260770514809";

export function PointsRewards() {
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [unlockedTier, setUnlockedTier] = useState<typeof REWARD_TIERS[0] | null>(null);
  const prevPointsRef = useRef<number | null>(null);

  /* ── Animated counter ── */
  useEffect(() => {
    if (points === displayPoints) return;
    const start = displayPoints;
    const diff = points - start;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 2000);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplayPoints(Math.round(start + diff * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
    if (prev !== null && newPoints > prev) {
      const unlocks = await recordRewardUnlocks(p.trim(), data?.customer_name ?? null, prev, newPoints);
      unlocks.forEach((u) => showRewardUnlock(u.points, u.label));
      if (unlocks.length > 0) {
        const topUnlock = REWARD_TIERS.find((t) => t.points === unlocks[unlocks.length - 1].points);
        if (topUnlock) setUnlockedTier(topUnlock);
        setCelebrate(true);
        setBurstKey((k) => k + 1);
        setTimeout(() => setCelebrate(false), 3500);
      }
    }
    prevPointsRef.current = newPoints;
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
    setUnlockedTier(null); prevPointsRef.current = null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = getUser();
    const stored = u?.whatsapp || localStorage.getItem(STORAGE_KEY);
    if (stored) { setPhone(stored); lookup(stored); }
  }, []);

  useEffect(() => {
    const pct = Math.min(100, (points / 100) * 100);
    const t = setTimeout(() => setDisplayPct(pct), 200);
    return () => clearTimeout(t);
  }, [points]);

  useEffect(() => {
    if (!loaded || !phone) return;
    const iv = setInterval(() => lookup(phone), 8000);
    return () => clearInterval(iv);
  }, [loaded, phone]);

  /* ── Derived state ── */
  const pct = Math.min(100, (points / 100) * 100);
  const nextTier = REWARD_TIERS.find((t) => points < t.points);
  const currentTier = [...REWARD_TIERS].reverse().find((t) => points >= t.points) ?? null;
  const ptsToNext = nextTier ? nextTier.points - points : 0;

  const claimMsg = (tier: typeof REWARD_TIERS[0]) =>
    `Hi Axxess! 👋 I've reached ${tier.points} points and unlocked: ${tier.reward}. My number is ${phone}. Please apply my reward to my next order. Thank you!`;

  return (
    <section id="rewards" className="px-4 py-16 sm:px-6" style={{ background: "#080808" }}>
      <div className="mx-auto max-w-2xl">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(229,25,42,0.1)", border: "1px solid rgba(229,25,42,0.25)", color: "#E5192A" }}>
            <Crown className="h-3.5 w-3.5" /> Axxess Rewards
          </div>
          <h2 className="font-display text-4xl font-black tracking-tight" style={{ color: "#fff", letterSpacing: "-1.5px" }}>
            Stream more.<br />
            <span style={{ background: "linear-gradient(135deg, #E5192A, #C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Earn more.</span>
          </h2>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Every subscription earns points. Points unlock real rewards.
          </p>
        </div>

        {/* ── Earn rate pills ── */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { icon: Zap, label: "Per subscription", pts: "+5 pts", color: "#E5192A" },
            { icon: Users, label: "Per referral", pts: "+10 pts", color: "#C9A84C" },
            { icon: Star, label: "Per review", pts: "+5 pts", color: "#a8a9ad" },
          ].map(({ icon: Icon, label, pts, color }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="font-black text-lg" style={{ color }}>{pts}</span>
              <span className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="relative overflow-hidden rounded-3xl" style={{ background: "linear-gradient(160deg, rgba(18,8,10,1) 0%, rgba(10,10,14,1) 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

          {/* Celebration burst */}
          {celebrate && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <span
                  key={`c-${burstKey}-${i}`}
                  className="absolute h-2.5 w-1 rounded-full animate-confetti"
                  style={{
                    left: `${2 + i * 2.4}%`,
                    background: ["#E5192A", "#C9A84C", "#fff", "#f59e0b", "#10b981", "#a855f7", "#3b82f6"][i % 7],
                    animationDelay: `${i * 28}ms`,
                  }}
                />
              ))}
              {[0, 200, 400].map((delay) => (
                <span
                  key={`ring-${burstKey}-${delay}`}
                  className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/50 animate-burst-ring"
                  style={{ width: 120, height: 120, animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}

          {!loaded ? (
            /* ── Phone lookup ── */
            <div className="p-8 sm:p-12">
              <div className="mx-auto max-w-xs text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(229,25,42,0.08)", border: "1px solid rgba(229,25,42,0.2)" }}>
                  <Crown className="h-9 w-9" style={{ color: "#E5192A" }} />
                </div>
                <h3 className="font-display text-xl font-bold text-white">Check your points</h3>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Enter the WhatsApp number you used when ordering.
                </p>
                <form onSubmit={handleSubmit} className="mt-6 text-left space-y-3">
                  <div>
                    <Label htmlFor="rw-phone" className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>WhatsApp number</Label>
                    <Input
                      id="rw-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0765 101 494"
                      required
                      maxLength={20}
                      className="mt-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#E5192A", boxShadow: "0 0 32px -8px rgba(229,25,42,0.7)" }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Check my points</>}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* ── Dashboard ── */
            <div>

              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full font-black text-sm" style={{
                    background: currentTier ? `${currentTier.color}20` : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${currentTier?.color ?? "rgba(255,255,255,0.1)"}`,
                    color: currentTier?.color ?? "rgba(255,255,255,0.3)",
                    boxShadow: currentTier ? `0 0 20px -6px ${currentTier.glow}` : "none",
                  }}>
                    {currentTier ? currentTier.emoji : "—"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{name || "Member"}</p>
                    <p className="text-[10px]" style={{ color: currentTier ? currentTier.color : "rgba(255,255,255,0.3)" }}>
                      {currentTier ? currentTier.label : "Start earning to unlock rewards"}
                    </p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.3)" }}>Switch</button>
              </div>

              {/* Points display */}
              <div className="relative px-6 pt-10 pb-4 text-center">
                <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(229,25,42,0.8), transparent 70%)", filter: "blur(30px)" }} />
                <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Your points</p>
                <div className="relative font-black leading-none" style={{ fontSize: "clamp(5rem, 18vw, 8rem)", color: "#fff", textShadow: "0 0 60px rgba(229,25,42,0.4)" }}>
                  {displayPoints}
                </div>
                <p className="text-xs uppercase tracking-[0.2em] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>points</p>
                {nextTier && (
                  <p className="mt-3 text-sm font-semibold" style={{ color: nextTier.color }}>
                    {ptsToNext} more point{ptsToNext !== 1 ? "s" : ""} → {nextTier.emoji} {nextTier.label}
                  </p>
                )}
                {!nextTier && (
                  <p className="mt-3 text-sm font-bold" style={{ color: "#E5192A" }}>👑 Maximum tier reached!</p>
                )}
              </div>

              {/* Progress bar */}
              <div className="px-6 pb-6">
                <div className="flex justify-between text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>0</span>
                  <span>100 pts = Free Month 👑</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-[2000ms] ease-[cubic-bezier(.34,1.56,.64,1)] relative overflow-hidden"
                    style={{
                      width: `${displayPct}%`,
                      background: "linear-gradient(90deg, #E5192A 0%, #ff4d4d 50%, #C9A84C 100%)",
                      boxShadow: "0 0 20px -4px rgba(229,25,42,0.8)",
                    }}
                  >
                    <div className="absolute inset-0 bar-shimmer" />
                  </div>
                  {/* Tier markers */}
                  {REWARD_TIERS.map((t) => (
                    <div
                      key={t.points}
                      className="absolute top-0 h-full w-0.5"
                      style={{
                        left: `${t.points}%`,
                        background: points >= t.points ? t.color : "rgba(255,255,255,0.15)",
                        boxShadow: points >= t.points ? `0 0 6px ${t.glow}` : "none",
                      }}
                    />
                  ))}
                </div>
                {/* Tier labels under bar */}
                <div className="relative h-5 mt-1">
                  {REWARD_TIERS.map((t) => (
                    <div key={t.points} className="absolute flex flex-col items-center" style={{ left: `${t.points}%`, transform: "translateX(-50%)" }}>
                      <span className="text-[8px] font-bold" style={{ color: points >= t.points ? t.color : "rgba(255,255,255,0.2)" }}>{t.emoji}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards ladder */}
              <div className="px-6 pb-6 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Rewards ladder</p>
                {REWARD_TIERS.map((tier) => {
                  const unlocked = points >= tier.points;
                  const isNext = tier === nextTier;
                  return (
                    <div
                      key={tier.points}
                      className="relative flex items-center gap-4 rounded-2xl p-4 transition-all duration-500"
                      style={{
                        background: unlocked ? `${tier.color}10` : isNext ? "rgba(255,255,255,0.03)" : "transparent",
                        border: unlocked ? `1px solid ${tier.color}40` : isNext ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                        boxShadow: unlocked ? `0 0 24px -8px ${tier.glow}` : "none",
                        opacity: !unlocked && !isNext ? 0.5 : 1,
                      }}
                    >
                      {/* Icon */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl transition-all duration-500" style={{
                        background: unlocked ? `${tier.color}20` : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${unlocked ? tier.color : "rgba(255,255,255,0.08)"}`,
                        boxShadow: unlocked ? `0 0 20px -6px ${tier.glow}` : "none",
                        transform: unlocked ? "scale(1.05)" : "scale(1)",
                      }}>
                        {unlocked ? tier.emoji : <Lock className="h-5 w-5" style={{ color: "rgba(255,255,255,0.2)" }} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black uppercase tracking-wider" style={{ color: unlocked ? tier.color : "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>
                            {tier.points} pts
                          </span>
                          {unlocked && <Check className="h-3 w-3" style={{ color: tier.color }} />}
                          {isNext && !unlocked && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase" style={{ background: "rgba(229,25,42,0.15)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.3)" }}>
                              Next up
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm" style={{ color: unlocked ? "#fff" : "rgba(255,255,255,0.4)" }}>{tier.label}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{tier.description}</p>
                      </div>

                      {/* Claim button */}
                      {unlocked && (
                        <a
                          href={`https://wa.me/${WA}?text=${encodeURIComponent(claimMsg(tier))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition-all hover:opacity-90"
                          style={{ background: tier.color, color: tier.color === "#fff" || tier.color === "#e5e4e2" ? "#000" : "#fff", boxShadow: `0 0 16px -4px ${tier.glow}` }}
                        >
                          <MessageCircle className="h-3 w-3" /> Claim
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom CTA — keep earning */}
              <div className="px-6 pb-8">
                <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(229,25,42,0.08), rgba(201,168,76,0.05))", border: "1px solid rgba(229,25,42,0.15)" }}>
                  <p className="text-sm font-bold text-white mb-1">Want more points faster?</p>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Refer a friend (+10 pts) or renew early (+5 pts). Every point counts.
                  </p>
                  <a
                    href={`https://wa.me/${WA}?text=${encodeURIComponent("Hi Axxess! I want to refer a friend and earn points. How does it work?")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#25D366", boxShadow: "0 0 24px -8px rgba(37,211,102,0.6)" }}
                  >
                    <MessageCircle className="h-4 w-4" /> Refer a friend on WhatsApp
                  </a>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
            }
