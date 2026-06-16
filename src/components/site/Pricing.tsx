import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Flame, Zap, ArrowRight } from "lucide-react";
import { CheckoutFlow } from "./CheckoutFlow";
import { resolveAccentHex, isLightAccent } from "@/lib/accent-colors";

/* ─── Real direct prices in ZMW ─────────────────────────────────────────────
   Netflix:    $8.99 USD × K17.5 = K157/mo
   Prime:      $8.99 USD × K17.5 = K157/mo
   Both:       K157 + K157       = K314/mo
   Source: netflix.com/zm (USD $8.99 standard), exchange rate ~K17.5/USD June 2026
────────────────────────────────────────────────────────────────────────────── */
const DIRECT_PRICES: Record<string, { zmw: number; label: string }> = {
  netflix: { zmw: 157, label: "netflix.com direct" },
  prime:   { zmw: 157, label: "amazon.com direct" },
  bundle:  { zmw: 314, label: "both direct" },
};

function getDirectPrice(slug: string, name: string) {
  const s = (slug + " " + name).toLowerCase();
  if (s.includes("netflix")) return DIRECT_PRICES.netflix;
  if (s.includes("prime"))   return DIRECT_PRICES.prime;
  if (s.includes("all") || s.includes("bundle") || s.includes("access")) return DIRECT_PRICES.bundle;
  return null;
}

type Service = {
  id: string;
  name: string;
  slug: string;
  price_kwacha: number;
  description: string | null;
  features: string[];
  accent_color: string | null;
  badge: string | null;
  is_full: boolean | null;
};

/* ─── Comparison table data ──────────────────────────────────────────────── */
const COMPARE_ROWS = [
  { label: "Price per month",       netflix: "K157",   prime: "K157",   axxess: "K70 / K60" },
  { label: "Activation",            netflix: "Card req.", prime: "Card req.", axxess: "WhatsApp" },
  { label: "Setup time",            netflix: "10–30 min", prime: "10–30 min", axxess: "15 min" },
  { label: "Contract",              netflix: "Monthly",  prime: "Monthly",  axxess: "None" },
  { label: "Local support",         netflix: "❌",       prime: "❌",       axxess: "✅" },
  { label: "Pays in Kwacha",        netflix: "❌",       prime: "❌",       axxess: "✅" },
];

export function Pricing() {
  const [services,    setServices]    = useState<Service[] | null>(null);
  const [selected,    setSelected]    = useState<Service | null>(null);
  const [ordersToday, setOrdersToday] = useState<Record<string, number>>({});
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) =>
        setServices((data ?? []).map((d: any) => ({
          ...d,
          features: Array.isArray(d.features) ? d.features : [],
        })))
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("orders")
      .select("service_id, service_name_snapshot")
      .gte("created_at", today.toISOString())
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((o: any) => {
          const k = o.service_id || o.service_name_snapshot;
          if (k) counts[k] = (counts[k] ?? 0) + 1;
        });
        setOrdersToday(counts);
      });
  }, []);

  return (
    <section id="plans" className="px-4 py-24 sm:px-6" style={{ background: "#080808" }}>
      <div className="mx-auto max-w-5xl">

        {/* ── Header ── */}
        <div className="mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: "#E5192A" }}>
            Plans
          </p>
          <h2 className="font-display font-black leading-none mb-4" style={{ fontSize: "clamp(36px, 6vw, 64px)", letterSpacing: "-2px", color: "#fff" }}>
            Pick your plan.
          </h2>
          <p className="text-base max-w-md" style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            No card. No contract. Activated via WhatsApp in 15 minutes.
          </p>
        </div>

        {/* ── Savings banner ── */}
        <div
          className="mb-10 flex items-center gap-4 rounded-2xl px-5 py-4"
          style={{ background: "linear-gradient(90deg, rgba(229,25,42,0.08), rgba(201,168,76,0.06))", border: "1px solid rgba(229,25,42,0.18)" }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(229,25,42,0.12)" }}>
            <Zap className="h-5 w-5" style={{ color: "#E5192A" }} fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              Netflix costs K157/mo if you pay directly. We charge K70.
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Based on $8.99 USD at current exchange rate (~K17.5/USD) — Jun 2026
            </p>
          </div>
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="flex-shrink-0 text-xs font-bold underline transition-colors"
            style={{ color: "#E5192A" }}
          >
            {showCompare ? "Hide" : "See comparison"}
          </button>
        </div>

        {/* ── Comparison table ── */}
        {showCompare && (
          <div className="mb-10 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", width: "35%" }}>
                  </th>
                  <th className="p-4 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Netflix direct
                  </th>
                  <th className="p-4 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Prime direct
                  </th>
                  <th className="p-4 text-center" style={{ background: "rgba(229,25,42,0.06)", borderLeft: "2px solid rgba(229,25,42,0.3)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#E5192A" }}>
                      Axxess ✓
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <td className="p-4 text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {row.label}
                    </td>
                    <td className="p-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {row.netflix}
                    </td>
                    <td className="p-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {row.prime}
                    </td>
                    <td className="p-4 text-center text-xs font-bold" style={{ color: "#E5192A", background: "rgba(229,25,42,0.04)", borderLeft: "2px solid rgba(229,25,42,0.3)" }}>
                      {row.axxess}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Plan cards ── */}
        {!services ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const accentHex      = resolveAccentHex(s.accent_color);
              const light          = isLightAccent(accentHex);
              const btnColor       = light ? "#000" : "#fff";
              const isFeatured     = s.badge === "Best Value" || s.badge === "Most Popular";
              const isFull         = !!s.is_full;
              const direct         = getDirectPrice(s.slug, s.name);
              const saving         = direct ? direct.zmw - Number(s.price_kwacha) : 0;
              const savingPct      = direct ? Math.round((saving / direct.zmw) * 100) : 0;
              const todayCount     = ordersToday[s.id] ?? ordersToday[s.name] ?? 0;

              return (
                <div
                  key={s.id}
                  onMouseMove={(e) => {
                    if (isFull) return;
                    const el = e.currentTarget as HTMLDivElement;
                    const r  = el.getBoundingClientRect();
                    const mx = (e.clientX - r.left) / r.width;
                    const my = (e.clientY - r.top)  / r.height;
                    el.style.transform  = `perspective(900px) rotateX(${(my - 0.5) * -7}deg) rotateY(${(mx - 0.5) * 7}deg) translateZ(6px)`;
                    el.style.setProperty("--mx", `${mx * 100}%`);
                    el.style.setProperty("--my", `${my * 100}%`);
                    el.style.transition = "transform 100ms ease-out";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform  = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
                    el.style.transition = "transform 600ms cubic-bezier(0.16,1,0.3,1)";
                  }}
                  className="relative flex flex-col overflow-hidden rounded-3xl p-5 sm:p-6"
                  style={{
                    background:     `radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.05) 0%, transparent 65%), rgba(12,12,12,0.9)`,
                    border:         isFeatured ? `1px solid ${accentHex}50` : "1px solid rgba(255,255,255,0.07)",
                    boxShadow:      isFeatured ? `0 0 60px -12px ${accentHex}40` : "0 4px 24px rgba(0,0,0,0.4)",
                    transformStyle: "preserve-3d",
                    willChange:     "transform",
                    opacity:        isFull ? 0.75 : 1,
                  }}
                >
                  {/* Badge */}
                  {isFull ? (
                    <span className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(229,25,42,0.15)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.3)" }}>
                      Full
                    </span>
                  ) : s.badge && (
                    <span className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: accentHex, color: btnColor }}>
                      {s.badge}
                    </span>
                  )}

                  {/* Plan name */}
                  <h3 className="font-display text-lg font-bold text-white mb-1">{s.name}</h3>
                  {s.description && (
                    <p className="text-xs mb-4 line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{s.description}</p>
                  )}

                  {/* Axxess price */}
                  <div className="flex items-end gap-2 mb-2">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>K</span>
                      <span className="font-display font-black leading-none" style={{ fontSize: "clamp(40px, 7vw, 52px)", color: accentHex, letterSpacing: "-1px" }}>
                        {Number(s.price_kwacha)}
                      </span>
                    </div>
                    <span className="mb-1.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>/mo</span>
                  </div>

                  {/* Savings vs direct */}
                  {direct && saving > 0 && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#10b981" }}>
                        You save K{saving}/mo
                      </span>
                      <span className="ml-auto text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                        vs K{direct.zmw} {direct.label}
                      </span>
                    </div>
                  )}

                  {/* Saving % pill */}
                  {savingPct > 0 && (
                    <div className="mb-4 -mt-2">
                      <span className="text-[10px] font-black" style={{ color: "#10b981" }}>
                        {savingPct}% cheaper than going direct
                      </span>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-5">
                    {s.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px]">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${accentHex}20` }}>
                          <Check className="h-2.5 w-2.5" style={{ color: accentHex }} />
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isFull ? (
                    <a
                      href="/reserve"
                      className="flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-all hover:border-primary/40 hover:text-white"
                      style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                    >
                      Reserve a slot <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button
                      onClick={() => setSelected(s)}
                      className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                      style={{
                        background:  accentHex,
                        color:       btnColor,
                        boxShadow:   `0 0 28px -6px ${accentHex}60`,
                      }}
                    >
                      Get Access <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Social proof */}
                  {todayCount > 0 && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <Flame className="h-3 w-3 text-orange-400" />
                      {todayCount} {todayCount === 1 ? "person" : "people"} ordered today
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Bottom trust strip ── */}
        {services && services.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              "⚡ Activated in 15 minutes",
              "🔒 No card required",
              "📱 Pay via MTN or Airtel",
              "✓ No contract — cancel anytime",
              "💬 Support on WhatsApp",
            ].map((t) => (
              <span key={t} className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                {t}
              </span>
            ))}
          </div>
        )}

      </div>

      <CheckoutFlow service={selected} onClose={() => setSelected(null)} />
    </section>
  );
                 }
