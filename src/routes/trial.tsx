// src/routes/trial.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckoutFlow } from "@/components/site/CheckoutFlow";
import {
  Sparkles, Loader2, CheckCircle2, MessageCircle, ShieldCheck,
  Zap, Lock, ArrowRight, Star, Clock, Gift, AlertTriangle,
  Eye, EyeOff, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { WHATSAPP_PRIMARY, waLink, orderMessage } from "@/lib/whatsapp";
import { rememberCustomer, getRememberedName, getRememberedPhone, firstName } from "@/lib/customer";

export const Route = createFileRoute("/trial")({
  head: () => ({
    meta: [
      { title: "Start Free Trial — Axxess Streaming" },
      {
        name: "description",
        content: "Start your 2-day free trial. Netflix or Prime Video — activated in 15 minutes, no card needed.",
      },
    ],
  }),
  component: TrialPage,
});

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceOption = {
  id:           string;
  name:         string;
  slug:         string;
  price_kwacha: number;
  is_full:      boolean;
};

type Credentials = {
  email:        string;
  password:     string;
  profile_name: string | null;
  pin:          string | null;
  expires_at:   string;
};

type PageState =
  | { phase: "form" }
  | { phase: "loading" }
  | { phase: "credentials"; service: string; credentials: Credentials; name: string; serviceObj: ServiceOption }
  | { phase: "full"; full_services: string[]; service_preference: string; serviceObj: ServiceOption | null }
  | { phase: "already_claimed" }
  | { phase: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function serviceLabel(slug: string) {
  if (slug === "netflix") return "Netflix";
  if (slug === "prime")   return "Prime Video";
  return slug;
}

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZM", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const AVATARS = [
  { bg: "#1a2744", l: "JM" },
  { bg: "#2d1810", l: "TC" },
  { bg: "#1a2d1a", l: "NB" },
  { bg: "#2d1a2d", l: "MP" },
  { bg: "#1a1a2d", l: "SK" },
];

function Counter({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.ceil(to / 40);
    const iv = setInterval(() => {
      n += step;
      if (n >= to) { setVal(to); clearInterval(iv); }
      else setVal(n);
    }, 30);
    return () => clearInterval(iv);
  }, [to]);
  return <>{val}</>;
}

// ── Credential row with copy button ─────────────────────────────────────────

function CredRow({
  label, value, secret = false,
}: { label: string; value: string; secret?: boolean }) {
  const [show,   setShow]   = useState(!secret);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className="font-mono text-sm font-semibold truncate" style={{ color: "#fff" }}>
          {show ? value : "••••••••••••"}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {secret && (
          <button
            onClick={() => setShow(s => !s)}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
          >
            {show ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        )}
        <button
          onClick={copy}
          className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-green-400" />
            : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

function TrialPage() {
  const [services,    setServices]    = useState<ServiceOption[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [state,       setState]       = useState<PageState>({ phase: "form" });
  const [name,        setName]        = useState(getRememberedName());
  const [phone,       setPhone]       = useState(getRememberedPhone());
  const [preference,  setPreference]  = useState<"netflix" | "prime">("netflix");
  const [checkoutSvc, setCheckoutSvc] = useState<ServiceOption | null>(null);

  useEffect(() => {
    supabase
      .from("services")
      .select("id,name,slug,price_kwacha,is_full")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data ?? []) as ServiceOption[]));

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .then(({ count }) => setActiveCount(count ?? 0));
  }, []);

  const netflixSvc = services.find(s => /netflix/i.test(s.name));
  const primeSvc   = services.find(s => /prime/i.test(s.name));

  const handleSubmit = async () => {
    const trimName  = name.trim();
    const trimPhone = phone.trim();

    if (trimName.length < 2) { toast.error("Please enter your full name."); return; }
    if (trimPhone.length < 9) { toast.error("Enter a valid WhatsApp number."); return; }

    setState({ phase: "loading" });

    try {
      const res = await supabase.functions.invoke("assign-trial", {
        body: {
          name:               trimName,
          phone:              trimPhone,
          service_preference: preference,
        },
      });

      const data = res.data as any;

      if (res.error || !data) {
        setState({ phase: "error", message: "Something went wrong. Please try WhatsApp directly." });
        return;
      }

      if (data.success) {
        rememberCustomer(trimName, trimPhone);
        const svcObj = data.service === "netflix" ? netflixSvc : primeSvc;
        setState({
          phase:       "credentials",
          service:     data.service,
          credentials: data.credentials,
          name:        data.name,
          serviceObj:  svcObj!,
        });
        return;
      }

      if (data.reason === "already_claimed") {
        setState({ phase: "already_claimed" });
        return;
      }

      if (data.reason === "full") {
        const pref = preference;
        const svcObj = pref === "netflix" ? netflixSvc : primeSvc;
        setState({
          phase:              "full",
          full_services:      data.full_services ?? [],
          service_preference: pref,
          serviceObj:         svcObj ?? null,
        });
        return;
      }

      setState({ phase: "error", message: data.message ?? "Unexpected error. Please try WhatsApp." });

    } catch (err) {
      setState({ phase: "error", message: "Connection error. Please try WhatsApp directly." });
    }
  };

  const trustItems = [
    { icon: ShieldCheck, label: "No card needed",  color: "#10B981" },
    { icon: Clock,       label: "Active in 15 min", color: "#E5192A" },
    { icon: Gift,        label: "2 days free",       color: "#C9A84C" },
  ];

  return (
    <SiteShell>
      <section
        className="relative min-h-screen px-4 pb-24 pt-8 sm:px-6 sm:pt-12 overflow-hidden"
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(229,25,42,0.08), transparent 70%)" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-lg">
          <AnimatePresence mode="wait">

            {/* ══════════════════════════════════════════════════════════════
                FORM STATE
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Header */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
                    style={{ borderColor: "rgba(229,25,42,0.3)", background: "rgba(229,25,42,0.08)" }}
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      2-Day Free Trial
                    </span>
                  </motion.div>

                  <h1 className="mt-4 font-display text-4xl font-black sm:text-5xl">
                    Try it. Love it.{" "}
                    <span style={{ color: "#E5192A" }}>Keep it.</span>
                  </h1>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
                    Pick a service and we'll activate your access in under 15 minutes. No card. No stress.
                  </p>

                  {/* Social proof */}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <div className="flex -space-x-2">
                      {AVATARS.map(a => (
                        <div
                          key={a.l}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#080808] text-[9px] font-bold text-white"
                          style={{ background: a.bg }}
                        >
                          {a.l}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activeCount !== null ? (
                        <>
                          <span className="font-semibold text-foreground"><Counter to={activeCount} /></span>{" "}
                          streaming right now
                        </>
                      ) : "Trusted across Zambia"}
                    </span>
                  </div>

                  {/* Trust bar */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {trustItems.map(({ icon: Icon, label, color }) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                        style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form card */}
                <div
                  className="mt-8 space-y-5 rounded-3xl border border-border p-6 sm:p-8"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  {/* Service selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Choose your service
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["netflix", "prime"] as const).map(svc => {
                        const label   = svc === "netflix" ? "Netflix" : "Prime Video";
                        const active  = preference === svc;
                        return (
                          <button
                            key={svc}
                            type="button"
                            onClick={() => setPreference(svc)}
                            className="relative flex flex-col items-center justify-center rounded-2xl px-4 py-4 text-sm font-bold transition-all hover:opacity-90"
                            style={{
                              background:  active ? "rgba(229,25,42,0.12)" : "rgba(255,255,255,0.04)",
                              border:      active ? "2px solid rgba(229,25,42,0.6)" : "2px solid rgba(255,255,255,0.08)",
                              color:       active ? "#fff" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {label}
                            {active && (
                              <span
                                className="mt-1 text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#E5192A" }}
                              >
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-1">
                      If your first choice is full, we'll automatically try the other.
                    </p>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="t-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your full name
                    </Label>
                    <Input
                      id="t-name"
                      required
                      maxLength={80}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Chanda Mwale"
                      className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="t-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      WhatsApp number
                    </Label>
                    <Input
                      id="t-phone"
                      placeholder="+260 ..."
                      required
                      maxLength={20}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground pl-1">
                      Used only to verify your identity. One trial per number, ever.
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!name.trim() || !phone.trim()}
                    className="relative w-full overflow-hidden rounded-full py-6 text-base font-black shadow-glow-red transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "#E5192A" }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" fill="currentColor" />
                      Start My Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
                        backgroundSize: "200% 100%",
                        animation: "trial-shimmer 2.4s ease infinite",
                      }}
                    />
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Trial lasts 2 days. No payment taken today.
                  </p>
                </div>

                {/* Reviews */}
                <div className="mt-6 flex items-center justify-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className="h-3.5 w-3.5 fill-[#C9A84C] text-[#C9A84C]" />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    "Activated in 8 minutes. Unreal." — Mwamba T.
                  </span>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                LOADING STATE
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 gap-4"
              >
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Checking availability…</p>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                CREDENTIALS STATE — show on-site
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 space-y-4"
              >
                {/* Success card */}
                <div
                  className="rounded-3xl border p-6 sm:p-8"
                  style={{
                    background:   "linear-gradient(160deg, rgba(16,185,129,0.06) 0%, rgba(8,8,8,1) 60%)",
                    borderColor:  "rgba(16,185,129,0.3)",
                    boxShadow:    "0 0 60px -20px rgba(16,185,129,0.25)",
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: "rgba(16,185,129,0.12)" }}
                  >
                    <CheckCircle2 className="h-8 w-8" style={{ color: "#10b981" }} />
                  </motion.div>

                  <h2 className="font-display text-2xl font-black text-center mb-1">
                    You're in,{" "}
                    <span style={{ color: "#10b981" }}>
                      {firstName(state.name) || "welcome"}
                    </span>
                    !
                  </h2>
                  <p className="text-sm text-center text-muted-foreground mb-6">
                    Your 2-day{" "}
                    <span className="font-semibold text-foreground">
                      {serviceLabel(state.service)}
                    </span>{" "}
                    trial is live. Use the credentials below to log in right now.
                  </p>

                  {/* Credentials */}
                  <div className="space-y-2.5">
                    <CredRow label="Email / Username" value={state.credentials.email} />
                    <CredRow label="Password" value={state.credentials.password} secret />
                    {state.credentials.profile_name && (
                      <CredRow label="Profile" value={state.credentials.profile_name} />
                    )}
                    {state.credentials.pin && (
                      <CredRow label="PIN" value={state.credentials.pin} secret />
                    )}
                    <div
                      className="flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Trial expires</p>
                        <p className="text-sm font-semibold text-white">
                          {formatExpiry(state.credentials.expires_at)}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Warning */}
                  <div
                    className="mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs"
                    style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.85)" }}
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    Do not change the account password or email. Use only your assigned profile. Violating this ends your trial immediately.
                  </div>
                </div>

                {/* Upsell */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl border p-6"
                  style={{
                    background:  "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(8,8,8,1) 70%)",
                    borderColor: "rgba(201,168,76,0.22)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(201,168,76,0.15)" }}>
                      <Lock className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>
                      Love what you see?
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-black leading-tight">
                    Lock in your first month for{" "}
                    <span style={{ color: "#C9A84C" }}>
                      K{state.serviceObj?.price_kwacha}
                    </span>{" "}
                    before your trial ends.
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    Same number. Same WhatsApp. No interruptions.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {["No card required", "Mobile money only", "Cancel anytime"].map(p => (
                      <span
                        key={p}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.85)" }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setCheckoutSvc(state.serviceObj)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #e8c96a)", color: "#000" }}
                  >
                    <Zap className="h-4 w-4" fill="currentColor" />
                    Yes, Lock In K{state.serviceObj?.price_kwacha} First Month
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    You won't be charged during your trial. This locks in your spot after it ends.
                  </p>
                </motion.div>

                <p className="text-center text-xs text-muted-foreground">
                  Or{" "}
                  <a href="/" className="underline underline-offset-4 hover:text-foreground transition-colors">
                    explore the site
                  </a>{" "}
                  while your trial is active.
                </p>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FULL STATE — no slots available
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "full" && (
              <motion.div
                key="full"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 space-y-4"
              >
                <div
                  className="rounded-3xl border p-6 sm:p-8 text-center"
                  style={{
                    background:  "linear-gradient(160deg, rgba(229,25,42,0.05) 0%, rgba(8,8,8,1) 60%)",
                    borderColor: "rgba(229,25,42,0.2)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: "rgba(229,25,42,0.1)" }}
                  >
                    <AlertTriangle className="h-8 w-8" style={{ color: "#E5192A" }} />
                  </div>

                  <h2 className="font-display text-2xl font-black mb-3">
                    Trial Slots Full
                  </h2>

                  {/* Dynamic message based on which services are full */}
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Free trial access is currently unavailable as{" "}
                    <span className="font-semibold text-foreground">
                      {state.full_services.length === 2
                        ? "Netflix and Prime Video are"
                        : state.full_services.includes("netflix")
                        ? "Netflix is"
                        : "Prime Video is"}
                    </span>{" "}
                    at full capacity. Premium slots are still open, and paid customers can still be activated immediately. Once payment is confirmed, we will have you streaming in no time.
                  </p>
                </div>

                {/* Paid CTA */}
                <div
                  className="rounded-3xl border p-6"
                  style={{
                    background:  "linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(8,8,8,1) 70%)",
                    borderColor: "rgba(201,168,76,0.25)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(201,168,76,0.15)" }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>
                      Paid Access — Always Available
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-black leading-tight mb-1.5">
                    Skip the waitlist.{" "}
                    <span style={{ color: "#C9A84C" }}>Go paid.</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Paid customers are always prioritised and activated immediately. No waiting for a slot to open.
                  </p>

                  {state.serviceObj ? (
                    <button
                      onClick={() => setCheckoutSvc(state.serviceObj)}
                      className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #C9A84C, #e8c96a)", color: "#000" }}
                    >
                      <Zap className="h-4 w-4" fill="currentColor" />
                      Get{" "}
                      {state.full_services.includes("netflix") && !state.full_services.includes("prime")
                        ? "Prime Video"
                        : state.full_services.includes("prime") && !state.full_services.includes("netflix")
                        ? "Netflix"
                        : serviceLabel(state.service_preference)}{" "}
                      — K{state.serviceObj.price_kwacha}/mo
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <a
                      href={waLink(WHATSAPP_PRIMARY, "Hi Axxess! 👋 I saw the free trial was full. I'd like to get a paid subscription instead. What are the options?")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition-all hover:scale-[1.02]"
                      style={{ background: "#25D366", color: "#000" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Get Paid Access on WhatsApp
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => setState({ phase: "form" })}
                  className="w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  ← Go back
                </button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ALREADY CLAIMED STATE
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "already_claimed" && (
              <motion.div
                key="claimed"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8"
              >
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{
                    background:  "linear-gradient(160deg, rgba(229,25,42,0.05) 0%, rgba(8,8,8,1) 60%)",
                    borderColor: "rgba(229,25,42,0.2)",
                  }}
                >
                  <div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: "rgba(229,25,42,0.1)" }}
                  >
                    <ShieldCheck className="h-8 w-8" style={{ color: "#E5192A" }} />
                  </div>
                  <h2 className="font-display text-2xl font-black mb-2">Already Claimed</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                    This number has already been used for a free trial. Each WhatsApp number can only claim one trial ever. If you'd like to continue streaming, grab a paid plan — it's just K70/month.
                  </p>
                  <a
                    href="/#plans"
                    className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition-all hover:scale-[1.02]"
                    style={{ background: "#E5192A", color: "#fff" }}
                  >
                    See Paid Plans
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
                <button
                  onClick={() => setState({ phase: "form" })}
                  className="mt-4 w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  ← Go back
                </button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ERROR STATE
            ══════════════════════════════════════════════════════════════ */}
            {state.phase === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 space-y-4"
              >
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <p className="text-sm text-muted-foreground mb-4">{state.message}</p>
                  <a
                    href={waLink(WHATSAPP_PRIMARY, "Hi Axxess! 👋 I'd like to start a free trial.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black"
                    style={{ background: "#25D366", color: "#000" }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Try on WhatsApp instead
                  </a>
                </div>
                <button
                  onClick={() => setState({ phase: "form" })}
                  className="w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  ← Go back
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </section>

      {/* Checkout modal */}
      <CheckoutFlow
        service={checkoutSvc as any}
        onClose={() => setCheckoutSvc(null)}
      />

      <style>{`
        @keyframes trial-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </SiteShell>
  );
    }
