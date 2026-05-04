import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Q = { id: string; question: string; options: { label: string; value: string }[] };

const QUESTIONS: Q[] = [
  {
    id: "use",
    question: "What do you use streaming for most?",
    options: [
      { label: "Movies", value: "movies" },
      { label: "Series", value: "series" },
      { label: "Sports", value: "sports" },
      { label: "Music", value: "music" },
      { label: "Everything", value: "everything" },
    ],
  },
  {
    id: "devices",
    question: "How many devices do you usually use?",
    options: [
      { label: "1 device", value: "1" },
      { label: "2 devices", value: "2" },
      { label: "3 devices", value: "3" },
      { label: "4 or more", value: "4+" },
    ],
  },
  {
    id: "frequency",
    question: "How often do you stream?",
    options: [
      { label: "Every day", value: "daily" },
      { label: "A few times a week", value: "weekly" },
      { label: "Only weekends", value: "weekends" },
      { label: "Once in a while", value: "rare" },
    ],
  },
  {
    id: "matters",
    question: "What matters most to you?",
    options: [
      { label: "Lowest price", value: "price" },
      { label: "Best value", value: "value" },
      { label: "Premium experience", value: "premium" },
      { label: "More access", value: "access" },
      { label: "Flexibility", value: "flex" },
    ],
  },
  {
    id: "love",
    question: "What would you love most from Axxess?",
    options: [
      { label: "Affordable access", value: "affordable" },
      { label: "A premium bundle", value: "bundle" },
      { label: "A longer subscription deal", value: "long" },
      { label: "A reward or bonus", value: "reward" },
      { label: "Help choosing the best option", value: "help" },
    ],
  },
];

type Recommendation = {
  name: string;
  reason: string;
  available: boolean; // false = needs reservation
  anchor: string; // where to scroll to
};

function recommend(answers: Record<string, string>): Recommendation {
  const { use, matters, love, frequency } = answers;

  // Music heavy → Spotify
  if (use === "music") {
    return {
      name: "Spotify",
      reason: "You're all about the music — Spotify is your perfect match.",
      available: true,
      anchor: "#plans",
    };
  }

  // Movies / Series / Everything with budget focus → Netflix
  if (
    (use === "movies" || use === "series" || use === "everything") &&
    (matters === "price" || matters === "value" || love === "affordable")
  ) {
    return {
      name: "Netflix",
      reason: "Best value for movies & series — and easy on the pocket.",
      available: true,
      anchor: "#plans",
    };
  }

  // Sports → Reserve (no instant package)
  if (use === "sports") {
    return {
      name: "Hulu / Sports Bundle",
      reason: "Sports streaming runs on a separate bundle. Reserve a slot — we'll set you up as soon as it opens.",
      available: false,
      anchor: "#reserve",
    };
  }

  // Premium experience or bundle → Reserve (Disney+/Prime/All-Access)
  if (matters === "premium" || love === "bundle" || matters === "access") {
    return {
      name: "Premium Bundle (Prime / Disney+ / All-Access)",
      reason: "You want the premium experience — let's reserve your slot for our top-tier bundles.",
      available: false,
      anchor: "#reserve",
    };
  }

  // Heavy daily user → Netflix
  if (use === "everything" || frequency === "daily") {
    return {
      name: "Netflix",
      reason: "Daily streaming + variety — Netflix has you covered today.",
      available: true,
      anchor: "#plans",
    };
  }

  // Default: Netflix (most accessible)
  return {
    name: "Netflix",
    reason: "Based on your answers, Netflix is your best starting point.",
    available: true,
    anchor: "#plans",
  };
}

export function PackageQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const select = (qid: string, value: string) => {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setDone(false);
  };

  const rec = done ? recommend(answers) : null;
  const progress = done ? 100 : Math.round((step / QUESTIONS.length) * 100);

  return (
    <section id="quiz" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Quick Quiz
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Find your perfect package</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Answer 5 quick questions and we'll match you to the right plan.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-10">
          {/* Progress bar */}
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {!done && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question {step + 1} of {QUESTIONS.length}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">{QUESTIONS[step].question}</h3>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {QUESTIONS[step].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => select(QUESTIONS[step].id, opt.value)}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-secondary px-5 py-4 text-left text-sm font-semibold text-foreground transition-smooth hover:border-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {done && rec && (
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your match</p>
              <h3 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-gradient-red">{rec.name}</h3>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">{rec.reason}</p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button asChild className="rounded-full bg-primary px-8 py-6 font-bold shadow-glow-red hover:bg-primary/90">
                  {rec.available ? (
                    <Link to="/" hash="plans">
                      See pricing
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  ) : (
                    <Link to="/reserve">
                      Reserve my slot
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  )}
                </Button>
                <Button onClick={restart} variant="outline" className="rounded-full px-6 py-6">
                  <RotateCcw className="mr-1 h-4 w-4" /> Retake quiz
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
