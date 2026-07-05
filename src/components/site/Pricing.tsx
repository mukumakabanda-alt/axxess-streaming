import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Flame, ArrowRight } from "lucide-react";
import { CheckoutFlow } from "./CheckoutFlow";
import { resolveAccentHex, isLightAccent } from "@/lib/accent-colors";
import { getRememberedPhone, rememberCustomer } from "@/lib/customer";
import { normalizePhone } from "@/lib/whatsapp";

/* ─── Real direct prices in ZMW ─────────────────────────────────────────────
   Netflix:    $9.99 USD × K17.5 = K175/mo
   Prime:      $5.99 USD × K17.5 = K105/mo
   Both:       K175 + K105       = K280/mo
────────────────────────────────────────────────────────────────────────────── */
const DIRECT_PRICES: Record<string, { zmw: number; label: string }> = {
  netflix: { zmw: 175, label: "netflix.com direct" },
  prime:   { zmw: 105, label: "amazon.com direct" },
  bundle:  { zmw: 280, label: "both direct" },
};

function getDirectPrice(slug: string, name: string) {
  const s = (slug + " " + name).toLowerCase();
  if (s.includes("netflix")) return DIRECT_PRICES.netflix;
  if (s.includes("prime"))   return DIRECT_PRICES.prime;
  if (s.includes("all") || s.includes("bundle") || s.includes("access")) return DIRECT_PRICES.bundle;
  return null;
}

type Service = {
  id:            string;
  name:          string;
  slug:          string;
  price_kwacha:  number;
  description:   string | null;
  features:      string[];
  accent_color:  string | null;
  badge:         string | null;
  is_full:       boolean | null;
};

export function Pricing() {
  const [services,    setServices]    = useState<Service[] | null>(null);
  const [selected,    setSelected]    = useState<Service | null>(null);
  const [ordersToday, setOrdersToday] = useState<Record<string, number>>({});
  // When true, CheckoutFlow skips the details screen and jumps straight to
  // payment because we already found an active/recent subscription for this
  // phone number — a returning customer never re-types their details.
  const [quickRenew,  setQuickRenew]  = useState(false);
  // Guards against double-clicking "Get Access" while the lookup is running
  const [checkingId,  setCheckingId]  = useState<string | null>(null);

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

    // Orders today — used for social proof only
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

  // Live sync — reflects Netflix/Prime profile fullness (via services.is_full)
  // the instant it changes, so a customer sitting on this page doesn't need
  // to refresh to see a plan flip to "Full" (or open back up).
  useEffect(() => {
    const channel = supabase
      .channel("pricing-services-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        (payload) => {
          setServices((prev) => {
            if (!prev) return prev; // initial fetch hasn't landed yet

            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as any)?.id;
              return prev.filter((s) => s.id !== removedId);
            }

            const row = payload.new as any;
            const normalized: Service = {
              ...row,
              features: Array.isArray(row.features) ? row.features : [],
            };

            // Deactivated while the page was open — treat like it vanished
            if (!row.is_active) {
              return prev.filter((s) => s.id !== normalized.id);
            }

            const exists = prev.some((s) => s.id === normalized.id);
            const next = exists
              ? prev.map((s) => (s.id === normalized.id ? normalized : s))
              : [...prev, normalized];

            return next.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Called on "Get Access". If this device already has a remembered phone
  // number, check Supabase for a real subscription under that number —
  // this is the same lookup /renew uses, so it's always accurate, never
  // just a guess from localStorage. Found → open checkout in quick-renew
  // mode with their details already known. Not found (or no remembered
  // phone yet) → open the normal first-time checkout form.
  const handleGetAccess = async (service: Service) => {
    const remembered = getRememberedPhone();

    if (!remembered || remembered.trim().length < 9) {
      setQuickRenew(false);
      setSelected(service);
      return;
    }

    setCheckingId(service.id);
    const normalized = normalizePhone(remembered);

    const { data } = await supabase
      .from("subscriptions")
      .select("id, customer_name, customer_phone, service_name, end_date, is_active")
      .eq("customer_phone", normalized)
      .order("end_date", { ascending: false })
      .limit(1);

    setCheckingId(null);

    const existing = data && data.length > 0 ? data[0] : null;

    if (existing) {
      // Refresh the remembered name/phone from the real record in case
      // this device's localStorage is stale or was never fully set
      rememberCustomer(existing.customer_name, normalized);
      setQuickRenew(true);
    } else {
      setQuickRenew(false);
    }

    setSelected(service);
  };

  return (
    <section id="plans" className="px-4 py-24 sm:px-6" style={{ background: "#080808" }}>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
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

        {/* Plan cards */}
        {!services ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(s => {
              const accentHex  = resolveAccentHex(s.accent_color);
              const light      = isLightAccent(accentHex);
              const btnColor   = light ? "#000" : "#fff";
              const isFull     = !!s.is_full;
              const isFeatured = s.badge === "Best Value" || s.badge === "Most Popular";
              const direct     = getDirectPrice(s.slug, s.name);
              const saving     = direct ? direct.zmw - Number(s.price_kwacha) : 0;
              const savingPct  = direct ? Math.round((saving / direct.zmw) * 100) : 0;
              const todayCount = ordersToday[s.id] ?? ordersToday[s.name] ?? 0;
              const isChecking = checkingId === s.id;

              return (
                <div
                  key={s.id}
                  onMouseMove={e => {
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
                  onMouseLeave={e => {
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
                  ) : s.badge ? (
                    <span className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: accentHex, color: btnColor }}>
                      {s.badge}
                    </span>
                  ) : null}

                  <h3 className="font-display text-lg font-bold text-white mb-1">{s.name}</h3>
                  {s.description && (
                    <p className="text-xs mb-4 line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{s.description}</p>
                  )}

                  {/* Price */}
                  <div className="flex items-end gap-2 mb-2">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>K</span>
                      <span className="font-display font-black leading-none" style={{ fontSize: "clamp(40px, 7vw, 52px)", color: accentHex, letterSpacing: "-1px" }}>
                        {Number(s.price_kwacha)}
                      </span>
                    </div>
                    <span className="mb-1.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>/mo</span>
                  </div>

                  {/* Savings */}
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
                      onClick={() => handleGetAccess(s)}
                      disabled={isChecking}
                      className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                      style={{ background: accentHex, color: btnColor, boxShadow: `0 0 28px -6px ${accentHex}60` }}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                        </>
                      ) : (
                        <>
                          Get Access <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
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

        {/* Trust strip */}
        {services && services.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              "⚡ Activated in 15 minutes",
              "🔒 No card required",
              "📱 Pay via MTN or Airtel",
              "✓ No contract — cancel anytime",
              "💬 Support on WhatsApp",
            ].map(t => (
              <span key={t} className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                {t}
              </span>
            ))}
          </div>
        )}

      </div>

      <CheckoutFlow
        service={selected}
        onClose={() => { setSelected(null); setQuickRenew(false); }}
        quickRenew={quickRenew}
      />
    </section>
  );
}
