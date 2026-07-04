import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckoutFlow } from "@/components/site/CheckoutFlow";
import {
  Loader2, Search, RefreshCw, Calendar, Zap,
  Bell, BellOff, CheckCircle2, ArrowRight, Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUser, rememberCustomer, getRememberedPhone, firstName,
} from "@/lib/customer";
import {
  normalizePhone, WHATSAPP_PRIMARY, waLink,
} from "@/lib/whatsapp";
import {
  loginOneSignalUser, setOneSignalTags, promptPushPermission,
} from "@/lib/onesignal";
import { z } from "zod";

export const Route = createFileRoute("/renew")({
  head: () => ({
    meta: [
      { title: "Renew — Axxess Streaming" },
      { name: "description", content: "Renew your Axxess subscription in under 60 seconds. No need to message us first." },
    ],
  }),
  component: RenewPage,
});

type Service  = { id: string; name: string; price_kwacha: number; is_full: boolean };
type SubRecord = {
  id:             string;
  customer_name:  string;
  customer_phone: string;
  service_name:   string;
  end_date:       string;
  is_active:      boolean;
};

function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate + "T00:00:00").getTime() - Date.now()) / 86400000);
}

function urgencyColour(days: number) {
  if (days < 0)  return { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" };
  if (days <= 3) return { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" };
  if (days <= 7) return { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" };
  return             { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
}

function RenewPage() {
  // Read phone from URL param (?phone=260...) so push notification deep-links
  // and the RenewalBanner link both land with the field pre-filled
  const search   = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlPhone = search.get("phone") ?? "";

  const [phone,        setPhone]        = useState(urlPhone || getRememberedPhone());
  const [loading,      setLoading]      = useState(false);
  const [subs,         setSubs]         = useState<SubRecord[] | null>(null);
  const [services,     setServices]     = useState<Service[]>([]);
  const [selectedSvc,  setSelectedSvc]  = useState<Service | null>(null);
  const [renewMonths,  setRenewMonths]  = useState(1);
  const [pushLinked,   setPushLinked]   = useState(false);
  const [promptingPush,setPromptingPush]= useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-search if we arrived with a phone in the URL (from push notification
  // deep-link or RenewalBanner) so the user sees their subscription immediately
  useEffect(() => {
    if (urlPhone) {
      handleLookup(urlPhone);
    }
    // Load services for the checkout upsell
    supabase
      .from("services")
      .select("id, name, price_kwacha, is_full")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data ?? []) as Service[]));
  }, []);

  const handleLookup = async (overridePhone?: string) => {
    const raw = (overridePhone ?? phone).trim();
    if (raw.length < 9) {
      toast.error("Enter your WhatsApp number");
      inputRef.current?.focus();
      return;
    }
    const normalized = normalizePhone(raw);
    setLoading(true);
    setSubs(null);

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, customer_name, customer_phone, service_name, end_date, is_active")
      .eq("customer_phone", normalized)
      .order("end_date", { ascending: false });

    setLoading(false);

    if (error) {
      toast.error("Couldn't look up your subscription. Try again.");
      return;
    }

    if (!data || data.length === 0) {
      setSubs([]);
      return;
    }

    const records = data as SubRecord[];
    setSubs(records);

    // Persist name and phone from the subscription record
    const latest = records[0];
    rememberCustomer(latest.customer_name, normalized);

    // Link this device to the phone number in OneSignal — critical for
    // WhatsApp customers who have never gone through the site checkout.
    // This is the moment they get connected to push notifications.
    loginOneSignalUser(normalized);
    setOneSignalTags({
      plan:     latest.service_name,
      phone:    normalized,
      renewal:  latest.end_date,
    });
  };

  const handleEnablePush = () => {
    setPromptingPush(true);
    promptPushPermission();
    // Optimistically mark as linked — the actual confirmation comes via
    // the subscription change event in onesignal.ts
    setTimeout(() => {
      setPushLinked(true);
      setPromptingPush(false);
      toast.success("You're set for push reminders 🔔");
    }, 1500);
  };

  // Find the matching service for a subscription record so we can
  // open CheckoutFlow pre-configured for that exact plan
  const serviceForSub = (sub: SubRecord): Service | undefined => {
    return services.find((s) =>
      s.name.toLowerCase().includes(sub.service_name.toLowerCase().split(" ")[0])
    );
  };

  // Services the customer does NOT currently have (for upsell)
  const upsellServices = (currentSubs: SubRecord[]): Service[] => {
    const currentNames = currentSubs.map((s) => s.service_name.toLowerCase());
    const hasNetflix   = currentNames.some((n) => n.includes("netflix"));
    const hasPrime     = currentNames.some((n) => n.includes("prime"));
    const hasAll       = currentNames.some((n) => n.includes("all") || n.includes("bundle"));
    if (hasAll) return [];
    return services.filter((s) => {
      const n = s.name.toLowerCase();
      if (n.includes("all") || n.includes("bundle")) return true;
      if (!hasNetflix && n.includes("netflix"))       return true;
      if (!hasPrime   && n.includes("prime"))         return true;
      return false;
    });
  };

  const user = getUser();

  return (
    <SiteShell>
      <section className="relative min-h-screen px-4 pb-24 pt-8 sm:px-6 sm:pt-12 overflow-hidden">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(229,25,42,0.07), transparent 70%)" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-lg">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
              style={{ borderColor: "rgba(229,25,42,0.3)", background: "rgba(229,25,42,0.08)" }}
            >
              <RefreshCw className="h-3 w-3 text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Renew</span>
            </div>
            <h1 className="font-display text-4xl font-black sm:text-5xl">
              {user?.name ? (
                <>Keep streaming,{" "}<span style={{ color: "#E5192A" }}>{firstName(user.name)}</span>.</>
              ) : (
                <>Renew in{" "}<span style={{ color: "#E5192A" }}>60 seconds.</span></>
              )}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              Enter your WhatsApp number — we'll pull up your subscription so you can renew straight away.
            </p>
          </motion.div>

          {/* ── Lookup form ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border p-6"
            style={{ background: "rgba(255,255,255,0.025)" }}
          >
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your WhatsApp number
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                ref={inputRef}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="e.g. 0765 101 494"
                inputMode="tel"
                className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm flex-1"
                autoFocus={!phone}
              />
              <Button
                onClick={() => handleLookup()}
                disabled={loading}
                className="h-12 w-12 rounded-2xl bg-primary flex-shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Use the same number you gave when you subscribed.
            </p>
          </motion.div>

          {/* ── Results ── */}
          <AnimatePresence mode="wait">

            {/* No subscription found */}
            {subs !== null && subs.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-3xl border border-border p-6 text-center"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <p className="font-semibold text-foreground">No subscription found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We couldn't find a subscription for that number. Double-check it's the one you used, or{" "}
                  <a
                    href={waLink(WHATSAPP_PRIMARY, "Hi Axxess! I need help finding my subscription.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    message us on WhatsApp
                  </a>.
                </p>
                <a
                  href="/#plans"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Browse Plans <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </motion.div>
            )}

            {/* Subscriptions found */}
            {subs !== null && subs.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Greeting */}
                <div className="px-1">
                  <p className="font-display text-lg font-bold">
                    Hey {firstName(subs[0].customer_name)} 👋
                  </p>
                  <p className="text-sm text-muted-foreground">Here's what we found on your account.</p>
                </div>

                {/* Push notification opt-in — this is the moment WhatsApp
                    customers get linked to push. Shown only if not already linked. */}
                {!pushLinked && (
                  <div
                    className="rounded-2xl border p-4 flex items-center justify-between gap-3"
                    style={{ background: "rgba(37,211,102,0.05)", borderColor: "rgba(37,211,102,0.2)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(37,211,102,0.12)" }}
                      >
                        <Bell className="h-4 w-4" style={{ color: "#25D366" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Get renewal reminders</p>
                        <p className="text-[11px] text-muted-foreground">We'll push you before your next expiry.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleEnablePush}
                      disabled={promptingPush}
                      className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: "#25D366", color: "#000" }}
                    >
                      {promptingPush ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
                    </button>
                  </div>
                )}

                {pushLinked && (
                  <div
                    className="rounded-2xl border p-3 flex items-center gap-2"
                    style={{ background: "rgba(37,211,102,0.05)", borderColor: "rgba(37,211,102,0.2)" }}
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#25D366" }} />
                    <p className="text-xs font-semibold" style={{ color: "#25D366" }}>
                      Push reminders enabled — we'll notify you before your subscription expires.
                    </p>
                  </div>
                )}

                {/* Each subscription card */}
                {subs.map((sub) => {
                  const dl     = daysLeft(sub.end_date);
                  const colour = urgencyColour(dl);
                  const svc    = serviceForSub(sub);
                  const expired = dl < 0;
                  // Live truth, not a guess — svc.is_full is kept in sync
                  // automatically from real Netflix/Prime profile inventory.
                  const full = !!svc?.is_full;

                  return (
                    <div
                      key={sub.id}
                      className={`rounded-3xl border p-5 ${colour.border} ${colour.bg}`}
                    >
                      {/* Plan + expiry */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-lg font-black text-foreground">{sub.service_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Expires {sub.end_date}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${colour.text} ${colour.bg} border ${colour.border}`}>
                          {expired ? "Expired" : dl === 0 ? "Today" : `${dl}d left`}
                        </span>
                      </div>

                      {/* Urgency message */}
                      <p className={`mt-3 text-sm font-semibold ${colour.text}`}>
                        {expired
                          ? "Your access has ended. Renew now to restore it instantly."
                          : dl <= 3
                          ? `Only ${dl} day${dl === 1 ? "" : "s"} left — renew now to keep streaming without interruption.`
                          : dl <= 7
                          ? `Renew in the next few days to avoid any gap in access.`
                          : `You're good for now — tap below to renew early and lock in another month.`}
                      </p>

                      {full ? (
                        /* Full — same treatment as the Pricing cards: no
                           point offering a duration picker for a plan that
                           has no free profile to assign right now. */
                        <>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {sub.service_name} is full right now — no profile is free to assign.
                          </p>
                          <a
                            href="/reserve"
                            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-bold transition-all hover:border-primary/40"
                            style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
                          >
                            Reserve a slot instead <ArrowRight className="h-4 w-4" />
                          </a>
                        </>
                      ) : (
                        <>
                          {/* Duration picker */}
                          {svc && (
                            <RenewDurationPicker
                              service={svc}
                              onSelect={(s, m) => { setSelectedSvc(s); setRenewMonths(m); }}
                            />
                          )}

                          {/* Renew CTA */}
                          <button
                            onClick={() => {
                              const s = svc ?? services[0];
                              if (s) setSelectedSvc(s);
                            }}
                            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              background: expired
                                ? "linear-gradient(135deg, #E5192A, #b01020)"
                                : "linear-gradient(135deg, #E5192A, #C9A84C)",
                              color: "#fff",
                              boxShadow: "0 0 24px -8px rgba(229,25,42,0.5)",
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            {expired ? "Restore Access Now" : "Renew Now"}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* ── Upsell — plans they don't have ── */}
                {upsellServices(subs).length > 0 && (
                  <div
                    className="rounded-3xl border p-5"
                    style={{ background: "rgba(201,168,76,0.04)", borderColor: "rgba(201,168,76,0.2)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4" style={{ color: "#C9A84C" }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#C9A84C" }}>
                        Add more for less
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-3">
                      You're only on one platform. Want both Netflix + Prime for K140/mo?
                    </p>
                    <div className="space-y-2">
                      {upsellServices(subs).map((s) => (
                        s.is_full ? (
                          <a
                            key={s.id}
                            href="/reserve"
                            className="w-full flex items-center justify-between rounded-2xl border p-3 text-left transition-all hover:border-primary/40"
                            style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">{s.name}</p>
                              <p className="text-xs text-muted-foreground">K{s.price_kwacha}/month</p>
                            </div>
                            <span
                              className="rounded-full px-3 py-1 text-xs font-bold"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                            >
                              Full
                            </span>
                          </a>
                        ) : (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedSvc(s); setRenewMonths(1); }}
                            className="w-full flex items-center justify-between rounded-2xl border p-3 text-left transition-all hover:border-primary/40"
                            style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.04)" }}
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">{s.name}</p>
                              <p className="text-xs text-muted-foreground">K{s.price_kwacha}/month</p>
                            </div>
                            <span
                              className="rounded-full px-3 py-1 text-xs font-bold"
                              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
                            >
                              Add →
                            </span>
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* WhatsApp fallback */}
                <p className="text-center text-xs text-muted-foreground pt-1">
                  Prefer to renew manually?{" "}
                  <a
                    href={waLink(WHATSAPP_PRIMARY, `Hi Axxess! I'd like to renew my subscription for ${subs[0]?.customer_name}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground"
                  >
                    Message us on WhatsApp
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CheckoutFlow opens pre-configured for the selected service.
          quickRenew skips the "enter your details" screen since we already
          have this customer's name/phone from the lookup above — this is
          what keeps renewal under 2 minutes. */}
      <CheckoutFlow
        service={selectedSvc}
        initialMonths={renewMonths}
        quickRenew
        onClose={() => { setSelectedSvc(null); setRenewMonths(1); }}
      />
    </SiteShell>
  );
}

/* ─── Duration picker inside each subscription card ───────────────────────
   Lets the user pick 1/2/3/6 months right on the renewal card, so the price
   they see in CheckoutFlow matches what they chose here. ──────────────── */
function RenewDurationPicker({
  service,
  onSelect,
}: {
  service: Service;
  onSelect: (s: Service, months: number) => void;
}) {
  const [months, setMonths] = useState(1);

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        How long?
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 6].map((m) => {
          const active = months === m;
          const price  = Number(service.price_kwacha) * m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMonths(m);
                // Pass the actual month count through so CheckoutFlow shows
                // the correct multi-month total instead of resetting to 1.
                onSelect(service, m);
              }}
              className={`relative rounded-xl border px-2 py-2 text-center transition-all ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <div className="text-sm font-bold leading-tight">
                {m}<span className="text-[10px] font-normal"> mo</span>
              </div>
              <div className="text-[10px] leading-tight opacity-80">K{price}</div>
              {m >= 3 && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1 py-0.5 text-[8px] font-bold text-black">
                  SAVE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
        }
