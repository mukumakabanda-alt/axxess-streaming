import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2 } from "lucide-react";
import { OrderDialog } from "./OrderDialog";
import { PremiumBundleTeaser } from "./PremiumBundleTeaser";
import { resolveAccentHex, isLightAccent } from "@/lib/accent-colors";

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

const POINTS_KEY = "axx_customer_phone";

export function Pricing() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [bundleUnlocked, setBundleUnlocked] = useState(false);

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

    // Check unlock status
    if (typeof window === "undefined") return;
    const phone = localStorage.getItem(POINTS_KEY);
    if (!phone) return;
    supabase
      .from("customer_points")
      .select("points")
      .eq("customer_phone", phone)
      .maybeSingle()
      .then(({ data }) => setBundleUnlocked((data?.points ?? 0) >= 50));
  }, []);

  return (
    <section id="plans" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Plans</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">
            Pick your access
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Simple monthly pricing. No hidden fees. Cancel anytime.
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
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-smooth sm:p-8 gradient-card ${
                    isFull ? "opacity-80" : "hover:-translate-y-1"
                  }`}
                  style={{
                    borderColor: isFeatured
                      ? `color-mix(in oklab, ${accentHex} 45%, transparent)`
                      : undefined,
                    boxShadow: isFeatured
                      ? `0 0 60px -10px color-mix(in oklab, ${accentHex} 50%, transparent)`
                      : undefined,
                  }}
                >
                  {isFull ? (
                    <span className="absolute right-4 top-4 rounded-full bg-destructive px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
                      Full
                    </span>
                  ) : s.badge && (
                    <span
                      className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: buttonTextColor, backgroundColor: accentHex }}
                    >
                      {s.badge}
                    </span>
                  )}

                  <h3 className="font-display text-2xl font-bold">{s.name}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  )}

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">K</span>
                    <span
                      className="font-display text-5xl font-bold tracking-tight"
                      style={{ color: accentHex }}
                    >
                      {Number(s.price_kwacha)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {s.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span
                          className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `color-mix(in oklab, ${accentHex} 18%, transparent)` }}
                        >
                          <Check className="h-2.5 w-2.5" style={{ color: accentHex }} />
                        </span>
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isFull ? (
                    <a
                      href="/reserve"
                      className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-smooth hover:bg-accent"
                    >
                      Reserve a slot
                    </a>
                  ) : (
                    <button
                      onClick={() => setSelected(s)}
                      className="mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-smooth hover:opacity-90"
                      style={{
                        backgroundColor: accentHex,
                        color: buttonTextColor,
                        boxShadow: `0 0 30px -8px color-mix(in oklab, ${accentHex} 60%, transparent)`,
                      }}
                    >
                      Get Access
                    </button>
                  )}
                </div>
              );
            })}

            {/* Premium bundle teaser */}
            <PremiumBundleTeaser unlocked={bundleUnlocked} />
          </div>
        )}
      </div>

      <OrderDialog service={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
