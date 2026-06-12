import { useEffect, useState } from "react";
import { X, Flame, ChevronRight } from "lucide-react";
import { useLocation, Link } from "@tanstack/react-router";

const POPUP_KEY = "axx_news_popup_v3";
const CLAUDE_API_KEY = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ?? "";

type PopupArticle = {
  headline: string;
  hook: string;
  emoji: string;
  category: string;
  controversial: boolean;
};

async function fetchPopupHook(): Promise<PopupArticle | null> {
  try {
    const prompt = `You are the editor of Axxess News, Zambia's most entertaining streaming news page. 
Generate ONE single breaking news popup notification for right now.

Rules:
- Headline must be a scroll-stopper (max 12 words). Zambian audience aged 18-40.
- Hook is ONE sentence that creates insane curiosity. Make them NEED to click.
- Category: one of: hot / zambia / series / movies / tea / axxess
- Make it feel urgent and current.
- controversial: true if it's spicy/divisive.

Respond ONLY with JSON — no markdown, no explanation:
{"headline": "string", "hook": "string", "emoji": "string", "category": "string", "controversial": boolean}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CAT_COLORS: Record<string, string> = {
  hot: "#FF6B35", zambia: "#198754", axxess: "#C9A84C",
  series: "#7C3AED", movies: "#0EA5E9", tea: "#EC4899",
};

export function NewsPopup() {
  const [article, setArticle] = useState<PopupArticle | null>(null);
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/news") return;

    const lastSeen = sessionStorage.getItem(POPUP_KEY);
    const now = Date.now();
    if (lastSeen && now - Number(lastSeen) < 1000 * 60 * 10) return;

    const timer = setTimeout(async () => {
      const data = await fetchPopupHook();
      if (!data) return;
      setArticle(data);
      setVisible(true);
      sessionStorage.setItem(POPUP_KEY, String(Date.now()));
    }, 5000);

    return () => clearTimeout(timer);
  }, [pathname]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setArticle(null), 400);
  };

  if (!article) return null;

  const accentColor = CAT_COLORS[article.category] ?? "#E5192A";

  return (
    <div
      className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-[340px]"
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "all 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(10,10,10,0.97)",
          border: `1px solid ${accentColor}30`,
          borderRadius: 18,
          backdropFilter: "blur(24px) saturate(200%)",
          boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 30px ${accentColor}10`,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 2.5, background: `linear-gradient(90deg, ${accentColor}, #C9A84C)` }} />

        {article.controversial && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            <Flame className="h-2.5 w-2.5" /> Hot take incoming
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
              >
                {article.emoji}
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: accentColor }}
              >
                {article.category} · Breaking
              </span>
            </div>
            <button
              onClick={dismiss}
              className="flex h-6 w-6 items-center justify-center rounded-full shrink-0 transition-colors hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3 text-white/40" />
            </button>
          </div>

          <p
            className="font-bold leading-snug mb-1.5"
            style={{ fontSize: 14, color: "rgba(255,255,255,0.95)", lineHeight: 1.35 }}
          >
            {article.headline}
          </p>

          <p
            className="text-xs leading-relaxed mb-3.5 italic"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {article.hook}
          </p>

          <div className="flex items-center gap-2">
            <Link
              to="/news"
              onClick={dismiss}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all"
              style={{ background: accentColor, color: "#fff" }}
            >
              Read it <ChevronRight className="h-3 w-3" />
            </Link>
            <button
              onClick={dismiss}
              className="rounded-full px-3 py-2 text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
