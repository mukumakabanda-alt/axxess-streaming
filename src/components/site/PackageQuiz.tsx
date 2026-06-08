import { useState } from "react";
import { Sparkles, ArrowRight, RotateCcw, MessageCircle, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";
import { motion, AnimatePresence } from "framer-motion";

type Q = { id: string; question: string; options: { label: string; value: string }[] };

const QUESTIONS: Q[] = [
  {
    id: "use",
    question: "What do you love streaming?",
    options: [
      { label: "🎬 Movies & series", value: "movies" },
      { label: "📺 Live TV & sports", value: "live" },
      { label: "🌍 Originals from everywhere", value: "originals" },
      { label: "🍿 A bit of everything", value: "all" },
    ],
  },
  {
    id: "device",
    question: "Where do you watch most?",
    options: [
      { label: "📱 Phone", value: "phone" },
      { label: "💻 Laptop", value: "laptop" },
      { label: "📺 TV at home", value: "tv" },
      { label: "🚗 On the move", value: "mobile" },
    ],
  },
  {
    id: "budget",
    question: "Your sweet spot?",
    options: [
      { label: "💸 Lowest possible price", value: "cheap" },
      { label: "💎 Best value for money", value: "value" },
      { label: "👑 Premium, no compromise", value: "premium" },
    ],
  },
  {
    id: "vibe",
    question: "Pick a vibe for tonight",
    options: [
      { label: "🔥 A new Netflix hit", value: "netflix" },
      { label: "⚡ Prime Originals", value: "prime" },
      { label: "⚽ Live sports", value: "dstv" },
      { label: "✨ I want it all", value: "all" },
    ],
  },
];

type Recommendation = {
  key: "prime" | "netflix" | "all" | "dstv";
  name: string;
  reason: string;
  available: boolean;
  price: number;
  realPrice: number;
};

function recommend(a: Record<string, string>): Recommendation {
  // DStv: live tv / sports
  if (a.use === "live" || a.vibe === "dstv") {
    return {
      key: "dstv",
      name: "DStv",
      reason: "Live sports & local TV — DStv is your match. Slots are limited, reserve yours.",
      available: false,
      price: 0,
      realPrice: 0,
    };
  }
  // All Access: premium / "all" / value
  if (a.budget === "premium" || a.vibe === "all" || a.use === "all") {
    return {
      key: "all",
      name: "All Access Bundle",
      reason: "Netflix + Prime in one. Best overall value, full experience.",
      available: true,
      price: 100,
      realPrice: 315,
    };
  }
  // Prime Video
  if (a.vibe === "prime" || a.use === "originals") {
    return {
      key: "prime",
      name: "Prime Video",
      reason: "Prime Originals, global hits — light on the pocket.",
      available: true,
      price: 60,
      realPrice: 170,
    };
  }
  // Netflix default
  return {
    key: "netflix",
    name: "Netflix",
    reason: "Movies, series, daily streaming — Netflix fits you best.",
    available: true,
    price: 70,
    realPrice: 197,
  };
}

export function PackageQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const select = (qid: string, value: string) => {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else setDone(true);
  };

  const back = () => { if (step > 0) setStep(step - 1); };
  const restart = () => { setAnswers({}); setStep(0); setDone(false); };

  const rec = done ? recommend(answers) : null;
  const progress = done ? 100 : Math.round((step / QUESTIONS.length) * 100);

  return (
    <section id="quiz" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 30-second quiz
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Find your perfect package</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">4 quick questions. Instant match.</p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-elegant sm:p-8">
          <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!done && (
              <motion.div
                key={`q-${step}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Question {step + 1} of {QUESTIONS.length}
                  </p>
                  {step > 0 && (
                    <button onClick={back} className="text-xs text-muted-foreground hover:text-primary">
                      ← Back
                    </button>
                  )}
                </div>
                <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">{QUESTIONS[step].question}</h3>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {QUESTIONS[step].options.map((opt) => {
                    const selected = answers[QUESTIONS[step].id] === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => select(QUESTIONS[step].id, opt.value)}
                        className={`group flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold transition-smooth ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-foreground hover:border-primary/60 hover:bg-primary/5"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100 group-hover:translate-x-0.5" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {done && rec && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your match</p>
                <h3 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-gradient-red">{rec.name}</h3>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">{rec.reason}</p>

                {rec.available && (
                  <p className="mt-4 text-sm">
                    <span className="text-muted-foreground line-through">K{rec.realPrice}/mo</span>
                    <span className="ml-2 font-display text-2xl font-bold">K{rec.price}<span className="text-xs text-muted-foreground">/mo</span></span>
                  </p>
                )}

                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  {rec.key === "dstv" ? (
                    <Link to="/reserve" className="btn-primary-cta px-7 py-3.5">
                      <Lock className="h-4 w-4" /> Reserve a Slot <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <a
                      href="#plans"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="btn-primary-cta px-7 py-3.5"
                    >
                      Get Access <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                  <a
                    href={waLink(WHATSAPP_PRIMARY, `Hi! I'd like to order ${rec.name}.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-6 py-3.5 text-sm font-semibold hover:bg-card"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp us
                  </a>
                </div>
                <button onClick={restart} className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <RotateCcw className="h-3 w-3" /> Start over
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
