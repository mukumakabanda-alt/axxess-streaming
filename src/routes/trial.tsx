import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Star,
  Clock,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { WHATSAPP_PRIMARY, waLink, orderMessage } from "@/lib/whatsapp";
import {
  rememberCustomer,
  getRememberedName,
  getRememberedPhone,
  firstName,
} from "@/lib/customer";

export const Route = createFileRoute("/trial")({
  head: () => ({
    meta: [
      { title: "Start Free Trial — Axxess Streaming" },
      {
        name: "description",
        content:
          "Start your 2-day free trial. Netflix or Prime Video — activated in 15 minutes, no card needed.",
      },
    ],
  }),
  component: TrialPage,
});

type Svc = { id: string; name: string; price_kwacha: number; is_full: boolean };

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is too short").max(80),
  customer_phone: z
    .string()
    .trim()
    .min(9, "Enter a valid WhatsApp number")
    .max(20),
  service_id: z.string().min(1, "Pick a package"),
});

/* ─── tiny animated counter ─────────────────────────────────────────────── */
function Counter({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(to / 40);
    const iv = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(iv); }
      else setVal(start);
    }, 30);
    return () => clearInterval(iv);
  }, [to]);
  return <>{val}</>;
}

/* ─── social proof avatars ───────────────────────────────────────────────── */
const AVATARS = [
  { bg: "#1a2744", l: "JM" },
  { bg: "#2d1810", l: "TC" },
  { bg: "#1a2d1a", l: "NB" },
  { bg: "#2d1a2d", l: "MP" },
  { bg: "#1a1a2d", l: "SK" },
];

/* ─── step indicator ─────────────────────────────────────────────────────── */
function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="rounded-full transition-all duration-500"
          style={{
            width: step === n ? 24 : 8,
            height: 8,
            background: step === n ? "#E5192A" : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
function TrialPage() {
  const [services, setServices] = useState<Svc[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [phone, setPhone] = useState(getRememberedPhone());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ name: string; price: number } | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("services")
      .select("id,name,price_kwacha,is_full")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data ?? []) as Svc[]));

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .then(({ count }) => setActiveCount(count ?? 0));
  }, []);

  const selectedSvc = services.find((s) => s.id === serviceId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: fd.get("customer_name"),
      customer_phone: fd.get("customer_phone"),
      service_id: serviceId,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setSubmitting(true);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);
    const { error } = await supabase.from("orders").insert({
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: null,
      service_id: svc.id,
      service_name_snapshot: svc.name,
      price_snapshot: 0,
      notes: "[FREE 2-DAY TRIAL]",
      duration_days: 2,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not start trial. Please try WhatsApp directly.");
      return;
    }
    rememberCustomer(parsed.data.customer_name, parsed.data.customer_phone);
    setDone({ name: svc.name, price: svc.price_kwacha });
  };

  /* ── trust bar items ── */
  const trustItems = [
    { icon: ShieldCheck, label: "No card needed", color: "#10B981" },
    { icon: Clock, label: "Active in 15 min", color: "#E5192A" },
    { icon: Gift, label: "2 days free", color: "#C9A84C" },
  ];

  return (
    <SiteShell>
      <section className="relative min-h-screen px-4 pb-24 pt-8 sm:px-6 sm:pt-12 overflow-hidden">

        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(229,25,42,0.08), transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-lg">

          {/* ── HEADER ── */}
          <AnimatePresence mode="wait">
            {!done && (
              <motion.div
                key="header"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                {/* Badge */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
                  style={{
                    borderColor: "rgba(229,25,42,0.3)",
                    background: "rgba(229,25,42,0.08)",
                  }}
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
                  Pick a plan and we'll activate your access in under 15
                  minutes. No card. No stress. Cancel in one WhatsApp message.
                </p>

                {/* Social proof */}
                <div className="mt-5 flex items-center justify-center gap-3">
                  <div className="flex -space-x-2">
                    {AVATARS.map((a) => (
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
                        <span className="font-semibold text-foreground">
                          <Counter to={activeCount} />
                        </span>{" "}
                        streaming right now
                      </>
                    ) : (
                      "Trusted across Zambia"
                    )}
                  </span>
                </div>

                {/* Trust bar */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {trustItems.map(({ icon: Icon, label, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: `${color}12`,
                        border: `1px solid ${color}28`,
                        color,
                      }}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FORM / SUCCESS ── */}
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <form
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-5 rounded-3xl border border-border p-6 sm:p-8"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  <StepDots step={1} />

                  {/* Package */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Choose your package
                    </Label>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm font-medium">
                        <SelectValue placeholder="Netflix, Prime Video…" />
                      </SelectTrigger>
                      <SelectContent>
                        {services
                          .filter(
                            (s) =>
                              !s.is_full && !/all\s*access|bundle/i.test(s.name)
                          )
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} — K{s.price_kwacha}/mo
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Selected package pill */}
                    <AnimatePresence>
                      {selectedSvc && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 flex items-center justify-between rounded-2xl px-4 py-2.5"
                            style={{
                              background: "rgba(229,25,42,0.08)",
                              border: "1px solid rgba(229,25,42,0.2)",
                            }}
                          >
                            <span className="text-xs font-semibold text-foreground">
                              {selectedSvc.name}
                            </span>
                            <span className="text-xs font-bold text-primary">
                              FREE for 2 days → K{selectedSvc.price_kwacha}/mo
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="t-name"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Your full name
                    </Label>
                    <Input
                      id="t-name"
                      ref={nameRef}
                      name="customer_name"
                      required
                      maxLength={80}
                      defaultValue={getRememberedName()}
                      placeholder="e.g. Chanda Mwale"
                      className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="t-phone"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      WhatsApp number
                    </Label>
                    <Input
                      id="t-phone"
                      name="customer_phone"
                      placeholder="+260 ..."
                      required
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 rounded-2xl border-border/60 bg-secondary/40 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground pl-1">
                      We'll send your login details here. That's it.
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={submitting || !serviceId}
                    className="relative w-full overflow-hidden rounded-full py-6 text-base font-black shadow-glow-red transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "#E5192A" }}
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4" fill="currentColor" />
                        Start My Free Trial
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                    {/* shimmer */}
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
                        backgroundSize: "200% 100%",
                        animation: "trial-shimmer 2.4s ease infinite",
                      }}
                    />
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Trial lasts 2 days. No payment taken today. Points are
                    earned on paid subscriptions only.
                  </p>
                </form>

                {/* Reviews strip */}
                <div className="mt-6 flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className="h-3.5 w-3.5 fill-[#C9A84C] text-[#C9A84C]"
                    />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    "Activated in 8 minutes. Unreal." — Mwamba T.
                  </span>
                </div>
              </motion.div>
            ) : (
              /* ══════════════════════════════════════════════════════════════
                 SUCCESS SCREEN
              ══════════════════════════════════════════════════════════════ */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8"
              >
                {/* Confirmation card */}
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(229,25,42,0.06) 0%, rgba(8,8,8,1) 60%)",
                    borderColor: "rgba(229,25,42,0.25)",
                    boxShadow: "0 0 60px -20px rgba(229,25,42,0.3)",
                  }}
                >
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                    style={{ background: "rgba(229,25,42,0.12)" }}
                  >
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <h2 className="mt-5 font-display text-3xl font-black">
                      You're in,{" "}
                      <span style={{ color: "#E5192A" }}>
                        {firstName(getRememberedName()) || "welcome"}
                      </span>
                      !
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Your 2-day free trial for{" "}
                      <span className="font-semibold text-foreground">
                        {done.name}
                      </span>{" "}
                      is confirmed. Tap the button below — we'll respond on
                      WhatsApp with your login in under 15 minutes.
                    </p>
                  </motion.div>

                  {/* Steps */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="mt-6 space-y-2 text-left"
                  >
                    {[
                      { n: "1", t: "Tap the button below" },
                      { n: "2", t: "We send your login details on WhatsApp" },
                      { n: "3", t: "Start watching in minutes" },
                    ].map(({ n, t }) => (
                      <div key={n} className="flex items-center gap-3">
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                          style={{ background: "#E5192A" }}
                        >
                          {n}
                        </div>
                        <span className="text-sm text-foreground/80">{t}</span>
                      </div>
                    ))}
                  </motion.div>

                  {/* Primary CTA — WhatsApp */}
                  <motion.a
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    href={waLink(
                      WHATSAPP_PRIMARY,
                      orderMessage(`${done.name} (FREE TRIAL)`, 0)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-4 text-sm font-black text-black transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Get My Access on WhatsApp
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                </div>

                {/* ════════════════════════════════════════════════════════
                    UPSELL BLOCK — the money moment
                ════════════════════════════════════════════════════════ */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 rounded-3xl border p-6"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(8,8,8,1) 70%)",
                    borderColor: "rgba(201,168,76,0.22)",
                  }}
                >
                  {/* Label */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ background: "rgba(201,168,76,0.15)" }}
                    >
                      <Lock className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-[0.18em]"
                      style={{ color: "#C9A84C" }}
                    >
                      Love what you see?
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-black leading-tight">
                    Lock in your first month for{" "}
                    <span style={{ color: "#C9A84C" }}>
                      K{done.price}
                    </span>{" "}
                    before your trial ends.
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    Don't let your access drop. Secure your subscription now and
                    keep watching without interruption — same number, same WhatsApp.
                  </p>

                  {/* Value pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "No card required",
                      "Mobile money only",
                      "Cancel anytime",
                    ].map((p) => (
                      <span
                        key={p}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{
                          background: "rgba(201,168,76,0.08)",
                          border: "1px solid rgba(201,168,76,0.2)",
                          color: "rgba(201,168,76,0.85)",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Upsell CTA */}
                  <a
                    href={waLink(
                      WHATSAPP_PRIMARY,
                      `Hi Axxess! 👋 I'm on my free trial for *${done.name}* and I'd like to lock in my first full month at K${done.price}. Please share payment details. Thank you!`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #C9A84C, #e8c96a)",
                      color: "#000",
                    }}
                  >
                    <Zap className="h-4 w-4" fill="currentColor" />
                    Yes, Lock In K{done.price} First Month
                    <ArrowRight className="h-4 w-4" />
                  </a>

                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    You won't be charged during your trial. This locks in your
                    spot after it ends.
                  </p>
                </motion.div>

                {/* Dismiss / browse link */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 text-center text-xs text-muted-foreground"
                >
                  Or{" "}
                  <a
                    href="/"
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    explore the site
                  </a>{" "}
                  while we set you up.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Scoped keyframe */}
      <style>{`
        @keyframes trial-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </SiteShell>
  );
  }
