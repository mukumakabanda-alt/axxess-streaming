import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Flame, RefreshCw, Tv2, Zap, TrendingUp, MessageCircle,
  Play, Share2, BookmarkPlus, ChevronRight, Star, Eye,
  ThumbsUp, Clock, Sparkles
} from "lucide-react";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Axxess News — Hot Takes, Drops & Zambian Tea ☕" },
      { name: "description", content: "The most unhinged, honest, and entertaining streaming news page in Zambia. Updated daily. Opinions included at no extra charge." },
      { property: "og:title", content: "Axxess News — We don't do boring" },
      { property: "og:description", content: "Hot takes on Netflix, Prime Video, Zambian entertainment & everything trending. Read at your own risk." },
    ],
  }),
  component: NewsPage,
});

/* ─── Types ────────────────────────────────────────────────────────────── */
type Article = {
  id: string;
  headline: string;
  hook: string;
  body: string;
  opinion: string;
  category: "hot" | "zambia" | "axxess" | "series" | "movies" | "tea";
  emoji: string;
  shareText: string;
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
  posterUrl?: string;
  trailerKey?: string;
  stats?: { label: string; value: string }[];
  readTime: number;
  controversial: boolean;
  timestamp: string;
};

type UserPrefs = {
  liked: string[];
  bookmarked: string[];
  viewed: string[];
  categoryScores: Record<string, number>;
};

/* ─── Constants ────────────────────────────────────────────────────────── */
const TMDB_KEY = (import.meta as any).env?.VITE_TMDB_KEY ?? "a88d5ae60c54ee1720dd60feda898521";
const CLAUDE_API_KEY = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ?? "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";
const PREFS_KEY = "axx_news_prefs_v2";
const CACHE_KEY = "axx_news_cache_v2";
const CACHE_TTL = 1000 * 60 * 30;

const CATEGORIES = [
  { id: "all",     label: "🔥 All",       color: "#E5192A" },
  { id: "hot",     label: "⚡ Hot",       color: "#FF6B35" },
  { id: "zambia",  label: "🇿🇲 Zambia",   color: "#198754" },
  { id: "axxess",  label: "🎯 Axxess",    color: "#C9A84C" },
  { id: "series",  label: "📺 Series",    color: "#7C3AED" },
  { id: "movies",  label: "🎬 Movies",    color: "#0EA5E9" },
  { id: "tea",     label: "☕ Tea",       color: "#EC4899" },
] as const;

/* ─── Preference helpers ────────────────────────────────────────────────── */
function loadPrefs(): UserPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? {
      liked: [], bookmarked: [], viewed: [], categoryScores: {},
    };
  } catch { return { liked: [], bookmarked: [], viewed: [], categoryScores: {} }; }
}
function savePrefs(p: UserPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}
function scoreCategory(prefs: UserPrefs, cat: string, delta: number): UserPrefs {
  const scores = { ...prefs.categoryScores };
  scores[cat] = (scores[cat] ?? 0) + delta;
  return { ...prefs, categoryScores: scores };
}

/* ─── TMDB trailer fetch ─────────────────────────────────────────────────── */
async function fetchTrailer(tmdbId: number, type: "movie" | "tv"): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/${type}/${tmdbId}/videos?api_key=${TMDB_KEY}&language=en-US`
    );
    const d = await r.json();
    const trailer = (d.results ?? []).find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    );
    return trailer?.key ?? null;
  } catch { return null; }
}

/* ─── Claude AI news generator ──────────────────────────────────────────── */
async function generateNews(
  prefs: UserPrefs,
  refreshCount: number
): Promise<Article[]> {
  if (refreshCount === 0) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.articles;
    } catch {}
  }

  const topCats = Object.entries(prefs.categoryScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const personalisationHint = topCats.length
    ? `This user prefers: ${topCats.join(", ")}. Weight more articles toward those categories.`
    : "No preference data yet — mix all categories equally.";

  const prompt = `You are the editor of Axxess News — the most entertaining, honest, and culturally-tuned streaming news page in Zambia. Your readers are Zambians aged 18–40 who love Netflix, Prime Video, series drama, celebrity gossip, Zambian entertainment, and hot takes. They use WhatsApp, they speak Zamglish (mix of English and Zambian slang). They respect boldness and hate corporate speak.

${personalisationHint}

Generate exactly 8 news articles for right now (${new Date().toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}). Make them feel like a smart, funny Zambian friend is reporting the news.

STRICT RULES:
- Every headline must be a scroll-stopper. Use controversy, curiosity gaps, or humour.
- The "hook" is ONE sentence that makes you NEED to read more. Make it slightly outrageous or intriguing.
- The "body" is 3-5 paragraphs with real info, facts, stats, Zambian cultural references where relevant. Write like a journalist who has opinions.
- The "opinion" is 1-2 sentences at the end — your personal take as a bold Zambian editor. Don't be neutral. Be memorable.
- The "shareText" is what someone would copy-paste to their WhatsApp group. Make it spicy enough to forward.
- Categories: hot (breaking/trending), zambia (Zambian entertainment/culture), axxess (Axxess Streaming tips/deals/news), series (TV series), movies, tea (celebrity gossip/drama).
- Mark truly controversial articles as controversial: true.
- Include a "stats" array with 2-3 real, surprising facts/numbers about the topic.
- For articles about specific shows/movies, include tmdbId (TMDB numeric ID) and tmdbType ("movie" or "tv").
- Mix categories. At least 1 "zambia", 1 "axxess", 2 "hot", and 2 "tea".
- readTime is 1-3 minutes.
- Make articles feel DIFFERENT from each other. Vary the tone — some funny, some informative, some outraged, some excited.

Respond ONLY with a valid JSON array of 8 objects. No markdown, no preamble, no explanation. The JSON must match this exact shape:
[{
  "id": "unique-slug-string",
  "headline": "string",
  "hook": "string",
  "body": "string",
  "opinion": "string",
  "category": "hot|zambia|axxess|series|movies|tea",
  "emoji": "single emoji",
  "shareText": "string",
  "tmdbId": number or null,
  "tmdbType": "movie"|"tv"|null,
  "posterUrl": null,
  "trailerKey": null,
  "stats": [{"label": "string", "value": "string"}],
  "readTime": number,
  "controversial": boolean,
  "timestamp": "ISO date string for today"
}]`;

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
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const raw = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  const clean = raw.replace(/```json|```/g, "").trim();
  const articles: Article[] = JSON.parse(clean);

  const enriched = await Promise.all(
    articles.map(async (a) => {
      if (a.tmdbId && a.tmdbType) {
        try {
          const r = await fetch(
            `https://api.themoviedb.org/3/${a.tmdbType}/${a.tmdbId}?api_key=${TMDB_KEY}&language=en-US`
          );
          const d = await r.json();
          a.posterUrl = d.poster_path
            ? `https://image.tmdb.org/t/p/w500${d.poster_path}`
            : undefined;
        } catch {}
        const key = await fetchTrailer(a.tmdbId, a.tmdbType);
        a.trailerKey = key ?? undefined;
      }
      return a;
    })
  );

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), articles: enriched }));
  } catch {}

  return enriched;
}

/* ─── Article card ───────────────────────────────────────────────────────── */
function ArticleCard({
  article,
  prefs,
  onLike,
  onBookmark,
  onView,
  onShare,
}: {
  article: Article;
  prefs: UserPrefs;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onView: (id: string) => void;
  onShare: (a: Article) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const liked = prefs.liked.includes(article.id);
  const bookmarked = prefs.bookmarked.includes(article.id);
  const viewed = prefs.viewed.includes(article.id);

  const cat = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[1];

  const handleExpand = () => {
    setExpanded(true);
    onView(article.id);
  };

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        background: "rgba(12,12,12,0.85)",
        borderColor: expanded ? cat.color + "40" : "rgba(255,255,255,0.06)",
        boxShadow: expanded
          ? `0 0 40px ${cat.color}15, 0 4px 24px rgba(0,0,0,0.4)`
          : "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {article.controversial && (
        <div
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-widest"
          style={{ background: "linear-gradient(90deg, #E5192A, #FF6B35)", color: "#fff" }}
        >
          <Flame className="h-3 w-3" /> Controversial — share with caution 👀
        </div>
      )}

      <div className="flex gap-0">
        {article.posterUrl && (
          <div className="shrink-0 w-24 sm:w-32 relative overflow-hidden">
            <img
              src={article.posterUrl}
              alt={article.headline}
              className="h-full w-full object-cover"
              style={{ minHeight: 140 }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c0c0c]" />
            {article.trailerKey && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(229,25,42,0.9)",
                    boxShadow: "0 0 20px rgba(229,25,42,0.6)",
                  }}
                >
                  <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                </span>
              </button>
            )}
          </div>
        )}

        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: cat.color + "20", color: cat.color, border: `1px solid ${cat.color}30` }}
            >
              {cat.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="h-2.5 w-2.5" /> {article.readTime} min read
            </span>
            {viewed && (
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                <Eye className="h-2.5 w-2.5" /> Read
              </span>
            )}
          </div>

          <h2
            className="font-bold leading-tight mb-1.5 cursor-pointer hover:text-[#E5192A] transition-colors"
            style={{ fontSize: "clamp(14px, 3vw, 17px)", color: "rgba(255,255,255,0.95)" }}
            onClick={handleExpand}
          >
            {article.emoji} {article.headline}
          </h2>

          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}
          >
            {article.hook}
          </p>

          {article.stats && article.stats.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {article.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg px-2.5 py-1"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span className="text-[10px] text-white/30 block">{s.label}</span>
                  <span className="text-xs font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {expanded && (
            <div
              className="text-sm leading-relaxed space-y-3 mb-4 pt-2 border-t"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}
            >
              {article.body.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}

              <div
                className="rounded-xl p-3 mt-3"
                style={{
                  background: `linear-gradient(135deg, ${cat.color}10, transparent)`,
                  border: `1px solid ${cat.color}25`,
                }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: cat.color }}>
                  🎙️ Axxess Editor's Take
                </p>
                <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.7)" }}>
                  "{article.opinion}"
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            {!expanded && (
              <button
                onClick={handleExpand}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: "#E5192A", color: "#fff" }}
              >
                Read <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onLike(article.id)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all"
              style={{
                background: liked ? "rgba(229,25,42,0.15)" : "rgba(255,255,255,0.05)",
                color: liked ? "#E5192A" : "rgba(255,255,255,0.4)",
                border: liked ? "1px solid rgba(229,25,42,0.3)" : "1px solid transparent",
              }}
            >
              <ThumbsUp className="h-3 w-3" /> {liked ? "Liked" : "Like"}
            </button>
            <button
              onClick={() => onBookmark(article.id)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all"
              style={{
                background: bookmarked ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)",
                color: bookmarked ? "#C9A84C" : "rgba(255,255,255,0.4)",
                border: bookmarked ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
              }}
            >
              <BookmarkPlus className="h-3 w-3" /> {bookmarked ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => onShare(article)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
            {article.trailerKey && !showTrailer && (
              <button
                onClick={() => { setShowTrailer(true); handleExpand(); }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all"
                style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}
              >
                <Play className="h-3 w-3" /> Trailer
              </button>
            )}
          </div>
        </div>
      </div>

      {showTrailer && article.trailerKey && (
        <div className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${article.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
              title="Trailer"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: "rgba(0,0,0,0.8)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            ✕
          </button>
        </div>
      )}
    </article>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 animate-pulse" style={{ background: "rgba(12,12,12,0.85)" }}>
      <div className="flex gap-0">
        <div className="w-24 sm:w-32 bg-white/5 shrink-0" style={{ minHeight: 140 }} />
        <div className="flex-1 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-16 rounded-full bg-white/5" />
            <div className="h-4 w-12 rounded-full bg-white/5" />
          </div>
          <div className="h-5 w-4/5 rounded bg-white/5" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="flex gap-2">
            <div className="h-7 w-16 rounded-full bg-white/5" />
            <div className="h-7 w-14 rounded-full bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const refreshCountRef = useRef(refreshCount);
  refreshCountRef.current = refreshCount;

  const load = useCallback(async (count: number) => {
    try {
      if (count > 0) setRefreshing(true); else setLoading(true);
      setError(null);
      const currentPrefs = loadPrefs();
      const data = await generateNews(currentPrefs, count);
      setArticles(data);
    } catch {
      setError("Couldn't load news right now. Network issue or Claude is taking a nap 😴 Try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const handleRefresh = () => {
    const next = refreshCount + 1;
    setRefreshCount(next);
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    load(next);
  };

  const handleLike = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const newPrefs = loadPrefs();
    const already = newPrefs.liked.includes(id);
    const updated = {
      ...scoreCategory(newPrefs, article.category, already ? -1 : 2),
      liked: already
        ? newPrefs.liked.filter((x) => x !== id)
        : [...newPrefs.liked, id],
    };
    savePrefs(updated);
    setPrefs(updated);
  };

  const handleBookmark = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const newPrefs = loadPrefs();
    const already = newPrefs.bookmarked.includes(id);
    const updated = {
      ...scoreCategory(newPrefs, article.category, already ? -1 : 1),
      bookmarked: already
        ? newPrefs.bookmarked.filter((x) => x !== id)
        : [...newPrefs.bookmarked, id],
    };
    savePrefs(updated);
    setPrefs(updated);
  };

  const handleView = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const newPrefs = loadPrefs();
    if (newPrefs.viewed.includes(id)) return;
    const updated = {
      ...scoreCategory(newPrefs, article.category, 1),
      viewed: [...newPrefs.viewed, id],
    };
    savePrefs(updated);
    setPrefs(updated);
  };

  const handleShare = (article: Article) => {
    const text = `${article.emoji} ${article.headline}\n\n${article.shareText}\n\n📲 Read more: axxstream.netlify.app/news`;
    if (navigator.share) {
      navigator.share({ title: article.headline, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      setShared(article.id);
      setTimeout(() => setShared(null), 2000);
    }
  };

  const filtered = activeCategory === "all"
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    const scoreA = (prefs.categoryScores[a.category] ?? 0) + (a.controversial ? 2 : 0);
    const scoreB = (prefs.categoryScores[b.category] ?? 0) + (b.controversial ? 2 : 0);
    return scoreB - scoreA;
  });

  const bookmarkedArticles = articles.filter((a) => prefs.bookmarked.includes(a.id));

  return (
    <SiteShell>
      <div className="min-h-screen" style={{ background: "#080808" }}>
        {/* ── Hero header ── */}
        <div
          className="relative overflow-hidden px-4 pt-8 pb-6 sm:px-6"
          style={{
            background: "linear-gradient(180deg, rgba(229,25,42,0.08) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em]"
                    style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}
                  >
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: "#E5192A",
                        animation: "newsDot 2s ease infinite",
                        display: "inline-block",
                      }}
                    />
                    Live · AI-Powered
                  </span>
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">
                    {new Date().toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
                <h1
                  className="font-black leading-none"
                  style={{
                    fontSize: "clamp(32px, 8vw, 52px)",
                    letterSpacing: "-2px",
                    color: "#fff",
                  }}
                >
                  Axxess{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #E5192A, #FF6B35)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    News
                  </span>
                </h1>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Hot takes. Real tea. Zero boring. ☕
                </p>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all shrink-0"
                style={{
                  background: "rgba(229,25,42,0.08)",
                  color: "#E5192A",
                  border: "1px solid rgba(229,25,42,0.25)",
                }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Loading..." : "Fresh"}
              </button>
            </div>

            {Object.keys(prefs.categoryScores).length > 0 && (
              <div
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(255,255,255,0.4)" }}
              >
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: "#C9A84C" }} />
                <span>Feed personalised from your reading habits</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div
          className="sticky top-[60px] z-30 overflow-x-auto"
          style={{
            background: "rgba(8,8,8,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex gap-1 px-4 py-2 min-w-max sm:px-6">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all"
                ? articles.length
                : articles.filter((a) => a.category === cat.id).length;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: active ? cat.color : "rgba(255,255,255,0.04)",
                    color: active ? "#fff" : "rgba(255,255,255,0.45)",
                    border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
                    boxShadow: active ? `0 0 16px ${cat.color}40` : "none",
                  }}
                >
                  {cat.label}
                  {count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-black"
                      style={{
                        background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                        color: active ? "#fff" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bookmarks bar ── */}
        {bookmarkedArticles.length > 0 && (
          <div
            className="px-4 py-3 sm:px-6 border-b"
            style={{ borderColor: "rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}
          >
            <div className="mx-auto max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#C9A84C" }}>
                <BookmarkPlus className="inline h-3 w-3 mr-1" />Saved
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {bookmarkedArticles.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
                    style={{ background: "rgba(201,168,76,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(201,168,76,0.15)" }}
                  >
                    {a.emoji} {a.headline.length > 35 ? a.headline.slice(0, 35) + "…" : a.headline}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Share toast ── */}
        {shared && (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ background: "#E5192A", color: "#fff", boxShadow: "0 8px 24px rgba(229,25,42,0.4)" }}
          >
            Copied to clipboard ✓
          </div>
        )}

        {/* ── Articles ── */}
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-4">
          {loading && (
            <>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              <p className="text-center text-xs py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Sparkles className="inline h-3 w-3 mr-1" />
                Claude is writing your personalised news feed...
              </p>
            </>
          )}

          {error && !loading && (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "rgba(229,25,42,0.05)", border: "1px solid rgba(229,25,42,0.2)" }}
            >
              <p className="text-white/60 text-sm mb-3">{error}</p>
              <button
                onClick={handleRefresh}
                className="rounded-full px-5 py-2 text-sm font-semibold"
                style={{ background: "#E5192A", color: "#fff" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/30 text-sm">No articles in this category today.</p>
            </div>
          )}

          {!loading && !error && sorted.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              prefs={prefs}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onView={handleView}
              onShare={handleShare}
            />
          ))}

          {!loading && !error && sorted.length > 0 && (
            <div className="text-center pt-4 pb-8">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                style={{
                  background: "rgba(229,25,42,0.08)",
                  color: "#E5192A",
                  border: "1px solid rgba(229,25,42,0.2)",
                }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Getting fresh tea..." : "Load new stories ☕"}
              </button>
              <p className="mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Feed learns your taste over time
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes newsDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(229,25,42,0); }
        }
      `}</style>
    </SiteShell>
  );
  }
