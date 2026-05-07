import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Newspaper, X } from "lucide-react";

const SHOWN_KEY = "axxess_news_shown";
const HEADLINE = "Axxess Streaming is officially live in Zambia 🇿🇲";

export function NewsPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    const t1 = setTimeout(() => {
      sessionStorage.setItem(SHOWN_KEY, "1");
      setShow(true);
    }, 50000);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed left-3 right-3 z-[55] sm:left-auto sm:right-5 sm:max-w-sm"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)", animation: "news-slide-up 0.4s cubic-bezier(.16,1,.3,1) forwards" }}
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-card/95 p-4 pl-5 shadow-elegant backdrop-blur-md">
        <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
        <button
          onClick={() => setShow(false)}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          <Newspaper className="h-3 w-3" /> New on Axxess
        </p>
        <p className="mt-1 pr-5 text-sm font-semibold leading-snug text-foreground">{HEADLINE}</p>
        <Link to="/news" onClick={() => setShow(false)} className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
          Read now →
        </Link>
      </div>
    </div>
  );
}
