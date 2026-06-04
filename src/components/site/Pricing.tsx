import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Flame } from "lucide-react";
import { CheckoutFlow } from "./CheckoutFlow";

import { resolveAccentHex, isLightAccent } from "@/lib/accent-colors";

// Real prices for anchor / "vs going direct" copy
const REAL_PRICE: Record<string, number> = { netflix: 197, spotify: 117, bundle: 315, prime: 170 };
function realPriceFor(slug: string, name: string): number | null {
  const s = (slug + " " + name).toLowerCase();
  if (s.includes("netflix")) return REAL_PRICE.netflix;
  if (s.includes("spotify")) return REAL_PRICE.spotify;
  if (s.includes("prime")) return REAL_PRICE.prime;
  if (s.includes("all") || s.includes("bundle")) return REAL_PRICE.bundle;
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


export function Pricing() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [ordersToday, setOrdersToday] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setServices(
          (data ?? []).map((d: any) => ({
            ...d,
            features: Array.isArray(d.features) ? d.features : [],
          })),
        );
      });

    // Real "people ordered today" counts per service
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    supabase
      .from("orders")
      .select("service_id, service_name_snapshot")
      .gte("created_at", startOfDay.toISOString())
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((o: any) => {
          const key = o.service_id || o.service_name_snapshot;
          if (!key) return;
          counts[key] = (counts[key] ?? 0) + 1;
        });
        setOrdersToday(counts);
      });

  }, []);

  return (
    <section id="plans" className="px-6 py-[120px]">
      <div className="mx-auto max-w-[1200px]">
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#E5192A", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
            Plans
          </p>
          <h2 className="font-display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 800, letterSpacing: "-2px", color: "#fff", lineHeight: 1 }}>
            Pick your plan.
          </h2>
          <p style={{ fontSize: "clamp(16px, 1.5vw, 20px)", color: "rgba(255,255,255,0.45)", marginTop: 16, marginBottom: 72, lineHeight: 1.6, maxWidth: 520 }}>
            No hidden fees. No contracts. Cancel by simply not renewing.
          </p>
        </div>

        {!services ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const accentHex = resolveAccentHex(s.accent_color);
              const light = isLightAccent(accentHex);
              const isFeatured = s.badge === "Best Value" || s.badge === "Most Popular";
              const buttonTextColor = light ? "#000" : "#fff";
              const isFull = !!s.is_full;
              return (
                <div
                  key={s.id}
                  onMouseMove={(e) => {
                    if (isFull) return;
                    const el = e.currentTarget as HTMLDivElement;
                    const r = el.getBoundingClientRect();
                    const mx = (e.clientX - r.left) / r.width;
                    const my = (e.clientY - r.top) / r.height;
                    const rx = (my - 0.5) * -8;
                    const ry = (mx - 0.5) * 8;
                    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
                    el.style.setProperty("--mx", `${mx * 100}%`);
                    el.style.setProperty("--my", `${my * 100}%`);
                    el.style.transition = "transform 120ms ease-out";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateZ(0)";
                    el.style.transition = "transform 600ms cubic-bezier(0.16,1,0.3,1)";
                  }}
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border p-5 sm:p-6 gradient-card ${
                    isFull ? "opacity-80" : ""
                  }`}
                  style={{
                    borderColor: isFeatured
                      ? `color-mix(in oklab, ${accentHex} 45%, transparent)`
                      : "rgba(255,255,255,0.06)",
                    boxShadow: isFeatured
                      ? `0 0 60px -10px color-mix(in oklab, ${accentHex} 50%, transparent)`
                      : "0 8px 30px -12px rgba(0,0,0,0.6)",
                    backgroundImage: `radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.06) 0%, transparent 60%), var(--gradient-card)`,
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                  }}
                >
                  {isFull ? (
                    <span className="absolute right-4 top-4 rounded-full bg-destructive px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
                      Full
                    </span>
                  ) : s.badge && (
                    <span
                      className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: buttonTextColor, backgroundColor: accentHex }}
                    >
                      {s.badge}
                    </span>
                  )}

                  <h3 className="font-display text-xl font-bold">{s.name}</h3>
                  {s.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">K</span>
                      <span
                        className="font-display text-4xl font-bold tracking-tight leading-none"
                        style={{ color: accentHex }}
                      >
                        {Number(s.price_kwacha)}
                      </span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                    {(() => {
                      const real = realPriceFor(s.slug, s.name);
                      return real ? (
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-foreground/70 leading-tight">
                            <span className="line-through decoration-primary/70">K{real}</span>
                            <span className="text-muted-foreground font-normal"> direct</span>
                          </p>
                          {(s.badge === "Most Popular" || s.badge === "Best Value") && (
                            <p className="text-[10px] font-bold text-emerald-400 leading-tight">
                              Save K{real - Number(s.price_kwacha)}/mo
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <ul className="mt-5 flex-1 space-y-2">
                    {s.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px]">
                        <span
                          className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `color-mix(in oklab, ${accentHex} 18%, transparent)` }}
                        >
                          <Check className="h-2.5 w-2.5" style={{ color: accentHex }} />
                        </span>
                        <span className="text-foreground/90 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isFull ? (
                    <a
                      href="/reserve"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-smooth hover:bg-accent"
                    >
                      Reserve a slot
                    </a>
                  ) : (
                    <button
                      onClick={() => setSelected(s)}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-smooth hover:opacity-90"
                      style={{
                        backgroundColor: accentHex,
                        color: buttonTextColor,
                        boxShadow: `0 0 30px -8px color-mix(in oklab, ${accentHex} 60%, transparent)`,
                      }}
                    >
                      Get Access
                    </button>
                  )}
                  {(() => {
                    const count = ordersToday[s.id] ?? ordersToday[s.name] ?? 0;
                    if (count <= 0) return null;
                    return (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-400" /> {count} {count === 1 ? "person" : "people"} ordered this today
                      </p>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CheckoutFlow service={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
