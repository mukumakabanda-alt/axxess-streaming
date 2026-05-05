import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

export type RewardToast = { id: number; points: number; label: string };

let listeners: ((t: RewardToast) => void)[] = [];

/** Trigger a reward popup from anywhere in the app. */
export function showRewardUnlock(points: number, label: string) {
  const t: RewardToast = { id: Date.now() + Math.random(), points, label };
  listeners.forEach((l) => l(t));
}

export function RewardUnlockToaster() {
  const [items, setItems] = useState<RewardToast[]>([]);

  useEffect(() => {
    const handler = (t: RewardToast) => {
      setItems((prev) => [...prev, t]);
      // Auto-dismiss after 4.5s
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 4500);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed right-3 z-[60] flex flex-col gap-2 sm:right-5"
         style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-[19rem] max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-2xl border border-primary/40 bg-card/95 p-3 pr-3 shadow-glow-red backdrop-blur-md animate-reward-slide"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow-red">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Reward unlocked!</p>
            <p className="truncate font-display text-sm font-bold">{t.label}</p>
            <p className="text-[11px] text-muted-foreground">{t.points} pts achieved</p>
          </div>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
