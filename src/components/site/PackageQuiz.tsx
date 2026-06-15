import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, RotateCcw, MessageCircle, Lock, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Option = {
  emoji: string;
  label: string;
  sub?: string;
  value: string;
};

type Question = {
  id: string;
  headline: string;
  sub: string;
  options: Option[];
};

type RecKey = "netflix" | "prime" | "bundle" | "reserve";

type Rec = {
  key: RecKey;
  name: string;
  tagline: string;
  reason: string;
  emoji: string;
  price: number | null;
  realPrice: number | null;
};

/* ─── Questions ──────────────────────────────────────────────────────────── */

const QUESTIONS: Question[] = [
  {
    id: "vibe",
    headline: "What's tonight's mood?",
    sub: "Pick the one that hits.",
    options: [
      { emoji: "🎬", label: "Binge a series", sub: "Can't stop, won't stop", value: "series" },
      { emoji: "🌍", label: "Discover something new", sub: "Originals & hidden gems", value: "originals" },
      { emoji: "⚽", label: "Live sports & TV", sub: "No spoilers please", value: "sports" },
      { emoji: "🍿", label: "Whatever's hot right now", sub: "Just give me the best", value: "trending" },
    ],
  },
  {
    id: "watching",
    headline: "Who's watching with you?",
    sub: "Be honest — no judgment.",
    options: [
      { emoji: "🧍", label: "Just me", sub: "My time, my picks", value: "solo" },
      { emoji: "👫", label: "Me & someone special", sub: "Date night selection", value: "couple" },
      { emoji: "👨‍👩‍👧", label: "The whole family", sub: "Kids included", value: "family" },
      { emoji: "🏠", label: "Roommates / squad", sub: "Everyone has a say", value: "squad" },
    ],
  },
  {
    id: "budget",
    headline: "What feels right on price?",
    sub: "All prices in Zambian Kwacha.",
    options: [
      { emoji: "💚", label: "Keep it light", sub: "Around K60–K70/mo", value: "light" },
      { emoji: "💛", label: "Best value wins", sub: "Around K100/mo", value: "value" },
      { emoji: "👑", label: "Give me everything", sub: "Max content, max quality", value: "premium" },
    ],
  },
];

/* ─── Recommendation logic ───────────────────────────────────────────────── */

function recommend(a: Record<string, string>): Rec {
  if (a.vibe === "sports") {
    return {
      key: "reserve",
      name: "DStv (Coming Soon)",
      tagline: "Secure your spot before it's gone.",
      reason: "Live sports & local TV is your thing — DStv is the obvious match. We're adding it soon. Reserve now to be first in line.",
      emoji: "⚽",
      price: null,
      realPrice: null,
    };
  }

  if (
    a.budget === "premium" ||
    a.budget === "value" ||
    a.vibe === "trending" ||
    a.watching === "family" ||
    a.watching === "squad"
  ) {
    return {
      key: "bundle",
      name: "Axxess All Access",
      tagline: "Netflix + Prime Video. One price.",
      reason: "With your taste and your crowd, you'd be switching apps anyway. Get both, pay less than either at full price.",
      emoji: "✨",
      price: 100,
      realPrice: 315,
    };
  }

  if (a.vibe === "originals" || a.watching === "couple") {
    return {
      key: "prime",
      name: "Axxess Prime",
      tagline: "Amazon Prime Video — global hits.",
      reason: "Prime Originals hit different. Great for two, easy on the wallet, and packed with content you won't find anywhere else.",
      emoji: "⚡",
      price: 60,
      realPrice: 170,
    };
  }

  return {
    key: "netflix",
    name: "Axxess Netflix",
    tagline: "The world's #1 streaming service.",
    reason: "Netflix is still king for series, films, and daily binge-worthy content. You'll never run out of things to watch.",
    emoji: "🎬",
    price: 70,
    realPrice: 197,
  };
}

/* ─── Dot indicator ──────────────────────────────────────────────────────── */

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 8,
            backgroundColor: i < current ? "#E5192A" : i === current ? "#E5192A" : "rgba(255,255,255,0.15)",
            opacity: i <= current ? 1 : 0.4,
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export function PackageQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[step];

  const pick = (value: string) => {
    if (selected) return; // prevent double-tap
    setSelected(value);
    setTimeout(() => {
      const next = { ...answers, [q.id]: value };
      setAnswers(next);
      setSelected(null);
      if (step + 1 < QUESTIONS.length) {
        setStep(step + 1);
      } else {
        setDone(true);
      }
    }, 380);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setSelected(null);
    setDone(false);
  };

  const rec = done ? recommend(answers) : null;

  return (
    <section id="quiz" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl">

        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" /> Find your plan in 30 seconds
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            What kind of streamer are you?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            3 questions. Zero guesswork. Your perfect plan, instantly.
          </p>
        </motion.div>

        {/* Card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#111] shadow-2xl"
          style={{ boxShadow: "0 0 0 1px rgba(229,25,42,0.08), 0 32px 80px -12px rgba(0,0,0,0.7)" }}
        >
          {/* Red accent top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          <div className="px-6 pb-8 pt-7 sm:px-8">

            <AnimatePresence mode="wait" initial={false}>
              {/* ── Question screen ── */}
              {!done && (
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Step counter + dots */}
                  <div className="mb-6 flex flex-col items-center gap-3">
                    <Dots total={QUESTIONS.length} current={step} />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Step {step + 1} of {QUESTIONS.length}
                    </p>
                  </div>

                  {/* Question text */}
                  <div className="mb-6 text-center">
                    <h3 className="font-display text-2xl font-bold sm:text-3xl">{q.headline}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{q.sub}</p>
                  </div>

                  {/* Options */}
                  <div className="grid gap-3">
                    {q.options.map((opt, i) => {
                      const isSelected = selected === opt.value;
                      return (
                        <motion.button
                          key={opt.value}
                          onClick={() => pick(opt.value)}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          whileTap={{ scale: 0.98 }}
                          disabled={!!selected}
                          className={`group relative flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/15 shadow-glow-red"
                              : "border-white/8 bg-white/4 hover:border-primary/50 hover:bg-white/6"
                          }`}
                        >
                          {/* Emoji */}
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                            style={{ background: isSelected ? "rgba(229,25,42,0.18)" : "rgba(255,255,255,0.06)" }}
                          >
                            {opt.emoji}
                          </span>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {opt.label}
                            </p>
                            {opt.sub && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{opt.sub}</p>
                            )}
                          </div>

                          {/* Arrow / check */}
                          <motion.div
                            animate={{ scale: isSelected ? 1 : 0.8, opacity: isSelected ? 1 : 0 }}
                            className="shrink-0"
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </motion.div>
                          {!isSelected && (
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Back link */}
                  {step > 0 && (
                    <div className="mt-5 text-center">
                      <button
                        onClick={() => { setSelected(null); setStep(step - 1); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ← Go back
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Result screen ── */}
              {done && rec && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.94, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center"
                >
                  {/* Big emoji */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, type: "spring", bounce: 0.45 }}
                    className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
                    style={{ background: "rgba(229,25,42,0.12)", border: "1px solid rgba(229,25,42,0.25)" }}
                  >
                    {rec.emoji}
                  </motion.div>

                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Your perfect match</p>
                  <h3 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-gradient-red">
                    {rec.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{rec.tagline}</p>

                  {/* Divider */}
                  <div className="my-5 h-px w-full bg-white/6" />

                  {/* Reason */}
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">
                    {rec.reason}
                  </p>

                  {/* Price */}
                  {rec.price !== null && rec.realPrice !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mt-5 inline-flex items-baseline gap-2 rounded-2xl border border-primary/20 bg-primary/8 px-5 py-3"
                    >
                      <span className="text-sm text-muted-foreground line-through">K{rec.realPrice}/mo</span>
                      <span className="font-display text-3xl font-black text-foreground">K{rec.price}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: "rgba(229,25,42,0.15)", color: "#E5192A" }}
                      >
                        {Math.round((1 - rec.price / rec.realPrice) * 100)}% off
                      </span>
                    </motion.div>
                  )}

                  {/* CTAs */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mt-6 flex flex-col items-center gap-3"
                  >
                    {rec.key === "reserve" ? (
                      <Link to="/reserve" className="btn-primary-cta w-full max-w-xs justify-center px-6 py-3.5">
                        <Lock className="h-4 w-4" /> Reserve my spot <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <a
                        href={waLink(WHATSAPP_PRIMARY, `Hi Axxess! 👋 The quiz matched me with *${rec.name}* at K${rec.price}/mo. I'd like to get started!`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary-cta w-full max-w-xs justify-center px-6 py-3.5"
                      >
                        <MessageCircle className="h-4 w-4" /> Get {rec.name} now <ArrowRight className="h-4 w-4" />
                      </a>
                    )}

                    <a
                      href="#plans"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                      See all plans instead
                    </a>
                  </motion.div>

                  {/* Restart */}
                  <button
                    onClick={restart}
                    className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Retake quiz
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Below-card note */}
        {!done && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No sign-up needed · Takes 30 seconds · Cancel anytime
          </p>
        )}
      </div>
    </section>
  );
}
