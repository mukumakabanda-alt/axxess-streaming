import { useEffect, useState } from "react";
import { X, Newspaper } from "lucide-react";
import { useLocation, Link } from "@tanstack/react-router";

const POPUP_KEY = "axx_news_popup_v2";

const POPUP_ARTICLES = [
  { title: "Stranger Things Season 5 — The final chapter is almost here", summary: "Netflix confirmed this is the end. No spin-offs, no reboots. Are you ready?" },
  { title: "The Boys Season 5 is filming — someone finally beats Homelander", summary: "Prime Video's most unhinged show just got more dangerous. K60/month via Axxess." },
  { title: "Zambia is streaming 67% more than last year — are you in?", summary: "The numbers are in. Zambia is a streaming nation. Axxess keeps it affordable." },
  { title: "Squid Game Season 3 confirmed — and it's already in post-production", summary: "After that ending? We need answers. Netflix via Axxess — K70/month." },
];

export function NewsPopup() {
  const [item, setItem] = useState<{ title: string; summary: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/news") return;
    const seen = sessionStorage.getItem(POPUP_KEY);
    if (seen) return;

    const timer = setTimeout(() => {
      const alreadySeen = sessionStorage.getItem(POPUP_KEY);
      if (alreadySeen) return;
      const random = POPUP_ARTICLES[Math.floor(Math.random() * POPUP_ARTICLES.length)];
      setItem(random);
      setVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [pathname]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(POPUP_KEY, "1");
    setTimeout(() => setItem(null), 400);
  };

  if (!item) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ background: "rgba(12,12,12,0.95)", border: "1px solid rgba(229,25,42,0.25)", borderRadius: 16, backdropFilter: "blur(24px) saturate(180%)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg, #E5192A, #C9A84C)" }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(229,25,42,0.12)", border: "1px solid rgba(229,25,42,0.2)" }}>
                <Newspaper className="h-3.5 w-3.5" style={{ color: "#E5192A" }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#E5192A" }}>
                🔥 Trending Now
              </span>
            </div>
            <button onClick={dismiss} className="flex h-6 w-6 items-center justify-center rounded-full transition-colors" style={{ background: "rgba(255,255,255,0.06)" }} aria-label="Dismiss">
              <X className="h-3 w-3 text-white/60" />
            </button>
          </div>

          <p className="font-semibold leading-snug mb-1" style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.4 }}>
            {item.title}
          </p>
          <p className="mb-3 line-clamp-2" style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.5 }}>
            {item.summary}
          </p>

          <Link to="/news" onClick={dismiss} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:opacity-90" style={{ background: "#E5192A", color: "#fff", fontSize: 12, fontWeight: 700 }}>
            Read on News page →
          </Link>
        </div>
      </div>
    </div>
  );
        }
