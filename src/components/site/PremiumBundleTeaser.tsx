import { useState } from "react";
import { Lock, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PremiumBundleTeaser({ unlocked = false }: { unlocked?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative flex w-full flex-col overflow-hidden rounded-3xl border-2 border-dashed p-6 text-left transition-smooth sm:p-8 ${
          unlocked
            ? "border-primary bg-primary/5 hover:bg-primary/10"
            : "border-border/70 bg-card/40 hover:border-primary/40"
        }`}
      >
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
          {unlocked ? <Sparkles className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
          {unlocked ? "Unlocked" : "50 pts to unlock"}
        </span>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5">
            <Sparkles className="h-6 w-6 text-primary" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold">Premium Bundle</h3>
            <p className="text-xs text-muted-foreground">HBO Max · Disney+ · Hulu</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-foreground/80">
          The ultimate combo for movie buffs and series lovers.
        </p>

        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <li>• Marvel, Star Wars, Pixar — all in one</li>
          <li>• HBO originals & cinematic premieres</li>
          <li>• Hulu's daily fresh catalog</li>
        </ul>

        <span className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary">
          {unlocked ? "Reserve your spot →" : "Earn 50 points to unlock"}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                  <Lock className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">Premium Bundle is locked</h3>
                  <p className="text-xs text-muted-foreground">HBO Max · Disney+ · Hulu</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-sm text-foreground/85">
              Unlock the Premium Bundle when you reach <span className="font-bold text-primary">50 points</span>.
              Earn points by subscribing, referring friends, and leaving reviews.
            </p>

            <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
              <div className="flex justify-between rounded-xl bg-secondary px-4 py-2">
                <span>Subscribe</span><span className="font-semibold text-primary">+5 pts</span>
              </div>
              <div className="flex justify-between rounded-xl bg-secondary px-4 py-2">
                <span>Refer a friend</span><span className="font-semibold text-primary">+10 pts</span>
              </div>
              <div className="flex justify-between rounded-xl bg-secondary px-4 py-2">
                <span>Leave a review</span><span className="font-semibold text-primary">+5 pts</span>
              </div>
            </div>

            <Link
              to="/rewards"
              onClick={() => setOpen(false)}
              className="btn-primary-cta mt-6 w-full"
            >
              Go to Rewards
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
