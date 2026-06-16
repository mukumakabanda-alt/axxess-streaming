import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useEffect, useState, useCallback } from "react";
import {
  Flame, RefreshCw, Play, Share2, BookmarkPlus,
  ChevronRight, Eye, ThumbsUp, Clock, Sparkles,
  Zap, X, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Axxess News — Hot Takes, Drops & Zambian Tea ☕" },
      { name: "description", content: "The most entertaining streaming news page in Zambia. Netflix, Prime Video, DStv. Real tea. Zero boring." },
      { property: "og:title", content: "Axxess News — We don't do boring" },
      { property: "og:description", content: "Hot takes on Netflix, Prime Video & everything trending in Zambia. Read at your own risk." },
    ],
  }),
  component: NewsPage,
});

/* ─── Types ─────────────────────────────────────────────────────────────── */
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
  backdropUrl?: string;
  trailerKey?: string;
  cast?: string[];
  rating?: number;
  stats?: { label: string; value: string }[];
  readTime: number;
  controversial: boolean;
  timestamp: string;
  cta?: { label: string; url: string };
  sourceUrl?: string;
  accentColor?: string;
};

type UserPrefs = {
  liked: string[];
  bookmarked: string[];
  viewed: string[];
  categoryScores: Record<string, number>;
};

/* ─── Constants ──────────────────────────────────────────────────────────── */
const NEWSDATA_KEY = (import.meta as any).env?.VITE_NEWSDATA_KEY ?? "pub_528ce14853854ade8b07e37ff6146996";
const TMDB_KEY = (import.meta as any).env?.VITE_TMDB_KEY ?? "a88d5ae60c54ee1720dd60feda898521";
const PREFS_KEY = "axx_news_prefs_v4";
const CACHE_KEY = "axx_news_cache_v6";
const CACHE_TTL = 1000 * 60 * 45;
const WA = "260770514809";

const CATEGORIES = [
  { id: "all",    label: "🔥 All",     color: "#E5192A" },
  { id: "hot",    label: "⚡ Hot",     color: "#FF6B35" },
  { id: "zambia", label: "🇿🇲 Zambia", color: "#198754" },
  { id: "axxess", label: "🎯 Axxess",  color: "#C9A84C" },
  { id: "series", label: "📺 Series",  color: "#7C3AED" },
  { id: "movies", label: "🎬 Movies",  color: "#0EA5E9" },
  { id: "tea",    label: "☕ Tea",     color: "#EC4899" },
] as const;

/* ─── TMDB show map ──────────────────────────────────────────────────────── */
const TMDB_SHOWS: Record<string, { id: number; type: "movie" | "tv"; accent: string }> = {
  "stranger things":       { id: 66732,  type: "tv",    accent: "#E5192A" },
  "the boys":              { id: 76479,  type: "tv",    accent: "#1a9de1" },
  "squid game":            { id: 93405,  type: "tv",    accent: "#E5192A" },
  "wednesday":             { id: 119051, type: "tv",    accent: "#7C3AED" },
  "fallout":               { id: 106379, type: "tv",    accent: "#C9A84C" },
  "citadel":               { id: 126108, type: "tv",    accent: "#0EA5E9" },
  "outer banks":           { id: 79744,  type: "tv",    accent: "#C9A84C" },
  "baby reindeer":         { id: 224136, type: "tv",    accent: "#EC4899" },
  "the grand tour":        { id: 61621,  type: "tv",    accent: "#FF6B35" },
  "reginald the vampire":  { id: 136153, type: "tv",    accent: "#E5192A" },
  "the night agent":       { id: 201243, type: "tv",    accent: "#0EA5E9" },
  "black mirror":          { id: 42009,  type: "tv",    accent: "#888" },
  "the last of us":        { id: 100088, type: "tv",    accent: "#C9A84C" },
  "house of the dragon":   { id: 94997,  type: "tv",    accent: "#E5192A" },
  "the witcher":           { id: 71912,  type: "tv",    accent: "#C9A84C" },
  "bridgerton":            { id: 92783,  type: "tv",    accent: "#EC4899" },
  "emily in paris":        { id: 105971, type: "tv",    accent: "#EC4899" },
  "ozark":                 { id: 69550,  type: "tv",    accent: "#198754" },
  "peaky blinders":        { id: 60574,  type: "tv",    accent: "#C9A84C" },
  "breaking bad":          { id: 1396,   type: "tv",    accent: "#198754" },
};

/* ─── TMDB fetch with backdrop + cast ───────────────────────────────────── */
async function fetchTMDB(id: number, type: "movie" | "tv") {
  try {
    const [details, videos, credits] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}`).then((r) => r.json()),
      fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_KEY}`).then((r) => r.json()),
      fetch(`https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${TMDB_KEY}`).then((r) => r.json()),
    ]);
    const poster   = details.poster_path   ? `https://image.tmdb.org/t/p/w500${details.poster_path}`    : undefined;
    const backdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : undefined;
    const trailer  = (videos.results ?? []).find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    );
    const cast = ((credits.cast ?? []) as any[])
      .slice(0, 4)
      .map((c: any) => c.name as string);
    return {
      poster,
      backdrop,
      trailerKey: trailer?.key ?? null,
      rating: details.vote_average as number,
      cast,
    };
  } catch { return null; }
}

/* ─── Editorial helpers ──────────────────────────────────────────────────── */
const ZAMBIAN_ANGLES: Record<string, string> = {
  netflix:   "Netflix Zambia is real — no more borrowing your cousin's login. Axxess has you sorted at K70/month.",
  prime:     "Prime Video hits different when you're watching from your couch in Lusaka. K60/month via Axxess.",
  dstv:      "DStv has been in Zambian living rooms longer than some of us have been alive. Reserve your slot.",
  streaming: "Zambians are out here watching on mobile data like absolute champions. Axxess keeps it affordable.",
  default:   "Zambia is streaming. The real question is — are you paying the right price? Axxess has the answer.",
};

const CTAS = [
  { label: "Watch on Netflix — K70/mo",    url: "/#plans" },
  { label: "Watch on Prime Video — K60/mo", url: "/#plans" },
  { label: "Get All Access — K140/mo",      url: "/#plans" },
  { label: "Start 2-Day Free Trial",        url: "/trial" },
  { label: "Reserve Your Slot →",           url: "/reserve" },
];

function getZambianAngle(text: string) {
  const t = text.toLowerCase();
  if (t.includes("netflix")) return ZAMBIAN_ANGLES.netflix;
  if (t.includes("prime"))   return ZAMBIAN_ANGLES.prime;
  if (t.includes("dstv"))    return ZAMBIAN_ANGLES.dstv;
  if (t.includes("stream"))  return ZAMBIAN_ANGLES.streaming;
  return ZAMBIAN_ANGLES.default;
}

function getCTA(text: string) {
  const t = text.toLowerCase();
  if (t.includes("prime"))                       return CTAS[1];
  if (t.includes("all access") || t.includes("bundle")) return CTAS[2];
  if (t.includes("trial"))                       return CTAS[3];
  if (t.includes("dstv") || t.includes("reserve")) return CTAS[4];
  return CTAS[0];
}

function getCategory(text: string): Article["category"] {
  const t = text.toLowerCase();
  if (t.includes("zambi") || t.includes("lusaka") || t.includes("african")) return "zambia";
  if (t.includes("axxess"))                                                   return "axxess";
  if (t.includes("season") || t.includes("series") || t.includes("episode")) return "series";
  if (t.includes("movie") || t.includes("film") || t.includes("cinema"))     return "movies";
  if (t.includes("celebrity") || t.includes("drama") || t.includes("beef"))  return "tea";
  return "hot";
}

const OPINIONS = [
  "If this doesn't make you open Netflix right now, I don't know what will. K70/month via Axxess. No excuses.",
  "This is exactly the content Zambians deserve access to. The price used to be the barrier. Axxess fixed that.",
  "Elite content deserves elite access. Axxess — K70 Netflix, K60 Prime, K140 both.",
  "Hot take: if you're not watching this, your entertainment taste needs a serious upgrade.",
  "Zambia has always had taste. Now we need the access. That's what Axxess is for.",
  "This is better than anything on free-to-air TV. Worth every ngwee of that K70.",
  "The show is a 10/10. Your streaming access should match. Axxess sorts you out.",
];

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #1a0a0a 0%, #E5192A 100%)",
  "linear-gradient(135deg, #0a0a1a 0%, #7C3AED 100%)",
  "linear-gradient(135deg, #0a1a0a 0%, #198754 100%)",
  "linear-gradient(135deg, #1a1a0a 0%, #C9A84C 100%)",
  "linear-gradient(135deg, #0a1a1a 0%, #0EA5E9 100%)",
  "linear-gradient(135deg, #1a0a1a 0%, #EC4899 100%)",
];

/* ─── Static fallback articles ───────────────────────────────────────────── */
const STATIC_ARTICLES: Article[] = [
  {
    id: "stranger-things-5",
    headline: "Stranger Things Season 5 Is The End And Netflix Is Not Playing",
    hook: "The Duffer Brothers confirmed this is it. No spin-offs. No reboots. Hawkins dies with this season and we are emotionally unprepared. 😭",
    body: "Netflix dropped the official teaser for Stranger Things Season 5 and the internet collectively stopped breathing.\n\nEpisodes will be the longest in the show's history — some reportedly over an hour. No filler. No budget cuts. This is their goodbye gift to one of the most culturally defining shows of the streaming era.\n\n🇿🇲 *Zambian angle:* Zambians have been watching Stranger Things since Season 1 on borrowed passwords and sketchy streams. Now watch the FINAL season properly — K70/month for Netflix via Axxess. No more borrowing.",
    opinion: "My controversial take: Will Byers was the most important character the entire time and nobody talked about it. Season 5 will prove me right.",
    category: "hot",
    emoji: "🔮",
    shareText: "Stranger Things Season 5 is the FINAL season 😭🔮 No spin-offs, no reboots — just pure finality. Watch on Netflix via Axxess — K70/month",
    tmdbId: 66732,
    tmdbType: "tv",
    accentColor: "#E5192A",
    stats: [
      { label: "Season 4 views",    value: "1.35B hours" },
      { label: "Countries trending", value: "93" },
      { label: "Via Axxess",        value: "K70/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get Netflix — K70/mo", url: "/#plans" },
  },
  {
    id: "the-boys-s5",
    headline: "The Boys S5: Someone Finally Beats Homelander — And It Looks Unhinged",
    hook: "Set photos leaked. Jensen Ackles is back. The showrunner said someone makes Homelander 'look like a golden retriever.' In a show where he literally nuked a crowd. We need to talk. 💥",
    body: "The Boys Season 5 is in production and it looks like the most chaotic season yet.\n\nShowrunner Eric Kripke hinted at a new villain who makes Homelander look tame. The entire cast described the finale as 'emotionally devastating.'\n\n🇿🇲 *Zambian angle:* The Boys is basically a documentary about powerful people with zero accountability. Zambians understand this energy on a spiritual level. Prime Video — K60/month via Axxess.",
    opinion: "Homelander is just a Zambian politician with laser eyes and a cape. The Boys is not entertainment — it's political education. Hot take: Billy Butcher was always the real villain.",
    category: "series",
    emoji: "💥",
    shareText: "The Boys Season 5 is filming and someone FINALLY beats Homelander 💥 Prime Video via Axxess — K60/month",
    tmdbId: 76479,
    tmdbType: "tv",
    accentColor: "#1a9de1",
    stats: [
      { label: "Season 4 viewers",  value: "65M households" },
      { label: "Prime subscribers", value: "200M+" },
      { label: "Via Axxess",        value: "K60/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get Prime Video — K60/mo", url: "/#plans" },
  },
  {
    id: "squid-game-3",
    headline: "Squid Game Season 3 Is In Post-Production. After THAT Ending. We Are Not Ready.",
    hook: "Netflix confirmed it. Already in post. Based on how Season 2 ended, this is either going to be the greatest finale in streaming history — or the most devastating. 🦑",
    body: "Squid Game Season 3 is confirmed and Hwang Dong-hyuk described it as the 'inevitable conclusion' to Gi-hun's arc.\n\nSeason 2 was watched in 93 countries. 'Red light, green light' entered everyday conversation globally. The show transcended language, culture, borders.\n\n🇿🇲 *Zambian angle:* Zambia already has its own version of Squid Game — it's called 'job hunting after graduation.' Dark? Yes. Accurate? Extremely. Watch the real thing on Netflix via Axxess.",
    opinion: "Squid Game Season 2 ended like a Zambian exam — you thought you were done and then there was a whole second page. Hot take: the games were never the point. The people running them always were.",
    category: "hot",
    emoji: "🦑",
    shareText: "Squid Game Season 3 is in post-production 🦑 After THAT ending?? We are absolutely NOT ready 😭 Netflix via Axxess — K70/month",
    tmdbId: 93405,
    tmdbType: "tv",
    accentColor: "#E5192A",
    stats: [
      { label: "S2 week 1 viewers", value: "68M households" },
      { label: "Countries top 10",  value: "93" },
      { label: "Via Axxess",        value: "K70/month" },
    ],
    readTime: 2,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch on Netflix — K70/mo", url: "/#plans" },
  },
  {
    id: "fallout-s2",
    headline: "Fallout Season 2 Is Coming And Prime Video Is Betting Everything On It",
    hook: "Amazon greenlit Fallout S2 faster than any show in Prime history. They know what they have. The question is whether they can top Season 1 — which was genuinely perfect television. ☢️",
    body: "Fallout Season 1 was the surprise hit of 2024. A video game adaptation — historically the worst genre on TV — became must-watch for people who had never touched a controller.\n\nWalton Goggins as The Ghoul was one of the best TV performances of 2024. The man ate every scene and asked for seconds.\n\n🇿🇲 *Zambian angle:* A post-apocalyptic wasteland where corporations control everything and regular people suffer? Zambians understand this cinematic universe on a deeply personal level. Prime Video — K60/month via Axxess.",
    opinion: "Fallout Season 1 is better than 90% of superhero content from the last decade. That's not a take — that's a fact. If you haven't watched it, fix that before Season 2 drops.",
    category: "series",
    emoji: "☢️",
    shareText: "Fallout Season 2 is confirmed and in production ☢️ Season 1 was ELITE. Prime Video via Axxess — K60/month",
    tmdbId: 106379,
    tmdbType: "tv",
    accentColor: "#C9A84C",
    stats: [
      { label: "S1 viewers (week 1)", value: "65M" },
      { label: "IMDb rating",         value: "8.5/10" },
      { label: "Via Axxess",          value: "K60/month" },
    ],
    readTime: 3,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch Fallout on Prime — K60/mo", url: "/#plans" },
  },
  {
    id: "zambia-streaming",
    headline: "Zambia's Streaming Consumption Grew 67% In 2024 — And These Numbers Are Wild",
    hook: "A new report confirmed Zambians spent 67% more time streaming in 2024. The streaming revolution didn't come — it already happened. Are you in it? 🇿🇲",
    body: "Mobile data usage for video streaming in Zambia grew 67% in 2024. 78% of that streaming happens on a smartphone.\n\nPeople watch on minibuses, during lunch, at the saloon, in the office. Streaming has become Zambia's new radio.\n\nThe biggest barrier remains cost — official subscriptions are priced in dollars. Axxess exists to fix that: Netflix K70, Prime K60, both for K140.",
    opinion: "The data says Zambia is ready. The question is just whether you're watching on a dodgy stream or a proper account. Get a proper account. You deserve better quality.",
    category: "zambia",
    emoji: "🇿🇲",
    shareText: "Zambia's streaming grew 67% in 2024 🇿🇲 We are officially a streaming nation. Axxess keeps it affordable — Netflix K70, Prime K60 🔥",
    accentColor: "#198754",
    stats: [
      { label: "Streaming growth",    value: "+67%" },
      { label: "Mobile viewing share", value: "78%" },
      { label: "Both platforms",       value: "K140/month" },
    ],
    readTime: 2,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Join the movement — K70/mo", url: "/#plans" },
  },
  {
    id: "wednesday-s2",
    headline: "Wednesday Season 2 Looks Darker, Weirder, And More Wednesday Than Season 1 Ever Was",
    hook: "Jenna Ortega looks like she's done being polite. The teaser shows her fully unleashed and honestly? We are HERE for it. 🖤",
    body: "Wednesday Season 1: 1.2 billion hours viewed in its first month. The pressure on Season 2 is immense.\n\nFrom what Netflix has shown, Season 2 leans harder into supernatural horror, gives Wednesday a proper character arc, and introduces new Nevermore students who are clearly doomed.\n\n🇿🇲 *Zambian angle:* Wednesday Addams refusing to conform while everyone pressures her to be 'normal'? That's every brilliant Zambian student who was told to fit in. Wednesday is Zambian energy. Watch it for K70/month via Axxess.",
    opinion: "Season 1 was holding back. Season 2 looks like they finally gave Jenna Ortega the full budget and said 'do what you want.' That's always when great TV happens.",
    category: "series",
    emoji: "🖤",
    shareText: "Wednesday Season 2 looks absolutely UNHINGED 🖤 Jenna Ortega said no more playing nice. Netflix via Axxess — K70/month",
    tmdbId: 119051,
    tmdbType: "tv",
    accentColor: "#7C3AED",
    stats: [
      { label: "S1 views (month 1)", value: "1.2B hours" },
      { label: "IMDb rating",        value: "8.1/10" },
      { label: "Via Axxess",         value: "K70/month" },
    ],
    readTime: 2,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch Wednesday on Netflix", url: "/#plans" },
  },
  {
    id: "all-access-case",
    headline: "K140 For Both Netflix AND Prime Video Is Actually The Smartest Financial Decision You Can Make",
    hook: "You're spending K70 on Netflix. Your friend is spending K60 on Prime. You're both missing half the shows. There's a smarter way and it costs K10 less than paying separately. Do the maths. 🎯",
    body: "Netflix: Stranger Things, Squid Game, Wednesday, Outer Banks, Baby Reindeer.\nPrime Video: The Boys, Fallout, The Grand Tour, Citadel.\nYou need both.\n\nAxxess All Access = K140/month. Less than one Shoprite grocery run. Less than two tanks of petrol. Less than one night out.\n\nActivated in 15 minutes via WhatsApp. No card. No contract. No stress.",
    opinion: "Choosing between Netflix and Prime in 2025 is like choosing between lunch and dinner. You need both. K140 a month. Stop playing games with yourself.",
    category: "axxess",
    emoji: "🎯",
    shareText: "Netflix K70 + Prime K60 = K130 separately. OR K140 for BOTH via Axxess All Access 🤯 The maths literally don't miss",
    accentColor: "#C9A84C",
    stats: [
      { label: "Netflix only",   value: "K70/month" },
      { label: "Prime only",     value: "K60/month" },
      { label: "All Access",     value: "K140/month" },
    ],
    readTime: 2,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Get All Access — K140/mo", url: "/#plans" },
  },
  {
    id: "dstv-vs-streaming",
    headline: "Netflix vs DStv In Zambia — The Honest Breakdown Nobody Else Will Give You",
    hook: "Zambia has been loyal to DStv for 30 years. Netflix arrived and chaos followed. Here's the real truth about both — and why you probably need both. 📺",
    body: "DStv: live football, local African content, familiar interface, been in our homes since before some of us were born.\n\nNetflix + Prime: better originals, on-demand, no rain signal disruption, more affordable via Axxess.\n\nThe honest answer is: most Zambian households will end up with both. DStv for live sports. Netflix/Prime for everything else. Axxess makes the streaming side affordable — K70, K60, or K140 for both.",
    opinion: "DStv and Netflix are not competitors — they're complements. Any household with both is simply winning at entertainment. Hot take: SuperSport alone justifies DStv. Everything else? Go streaming.",
    category: "zambia",
    emoji: "📺",
    shareText: "Netflix vs DStv in Zambia 🇿🇲 Honest breakdown: they're actually complements. And Axxess makes streaming affordable — K70 Netflix, K60 Prime",
    accentColor: "#198754",
    stats: [
      { label: "DStv in Zambia",   value: "30+ years" },
      { label: "Netflix via Axxess", value: "K70/month" },
      { label: "Both platforms",    value: "K140/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get streaming sorted — K70/mo", url: "/#plans" },
  },
];

/* ─── TMDB auto-enrich static articles ───────────────────────────────────── */
async function enrichArticles(articles: Article[]): Promise<Article[]> {
  return Promise.all(
    articles.map(async (a) => {
      if (a.posterUrl || !a.tmdbId || !a.tmdbType) return a;
      const tmdb = await fetchTMDB(a.tmdbId, a.tmdbType);
      if (!tmdb) return a;
      return {
        ...a,
        posterUrl:   tmdb.poster,
        backdropUrl: tmdb.backdrop,
        trailerKey:  tmdb.trailerKey ?? undefined,
        rating:      tmdb.rating,
        cast:        tmdb.cast,
        stats: [
          ...(a.stats ?? []),
          ...(tmdb.rating ? [] : []),
        ],
      };
    })
  );
}

/* ─── NewsData.io live fetch ──────────────────────────────────────────────── */
async function fetchLiveNews(): Promise<Article[]> {
  try {
    const queries = ["Netflix series 2025", "Amazon Prime Video show", "streaming entertainment 2025"];
    const q = queries[Math.floor(Math.random() * queries.length)];
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${encodeURIComponent(q)}&language=en&category=entertainment&size=8`
    );
    if (!res.ok) throw new Error(`NewsData ${res.status}`);
    const data = await res.json();
    const items: any[] = data.results ?? [];
    if (!items.length) throw new Error("empty");

    const articles: Article[] = await Promise.all(
      items.slice(0, 8).map(async (item, i) => {
        const title: string = item.title ?? "Untitled";
        const desc: string  = item.description ?? item.content ?? "";
        const combined      = title + " " + desc;
        const category      = getCategory(combined);
        const cta           = getCTA(combined);
        const zambianAngle  = getZambianAngle(combined);
        const hook          = desc.length > 30 ? desc : `${title} — and the internet is not ready.`;
        const opinion       = OPINIONS[i % OPINIONS.length];

        let posterUrl: string | undefined;
        let backdropUrl: string | undefined;
        let trailerKey: string | undefined;
        let tmdbId: number | undefined;
        let tmdbType: "movie" | "tv" | undefined;
        let rating: number | undefined;
        let cast: string[] | undefined;
        let accentColor = "#E5192A";

        for (const [kw, tmdb] of Object.entries(TMDB_SHOWS)) {
          if (combined.toLowerCase().includes(kw)) {
            const r = await fetchTMDB(tmdb.id, tmdb.type);
            if (r) {
              posterUrl   = r.poster;
              backdropUrl = r.backdrop;
              trailerKey  = r.trailerKey ?? undefined;
              rating      = r.rating;
              cast        = r.cast;
              tmdbId      = tmdb.id;
              tmdbType    = tmdb.type;
              accentColor = tmdb.accent;
            }
            break;
          }
        }

        const emojis = ["🔥","⚡","💥","🎬","📺","☕","👀","🎯"];
        return {
          id:          `live-${i}-${Date.now()}`,
          headline:    title,
          hook,
          body:        `${desc}\n\n🇿🇲 *Zambian angle:* ${zambianAngle}`,
          opinion,
          category,
          emoji:       emojis[i % emojis.length],
          shareText:   `😮 ${title}\n\n${hook}\n\n📲 Read on Axxess News: axxess-streaming.lovable.app/news`,
          tmdbId, tmdbType, posterUrl, backdropUrl, trailerKey, rating, cast,
          accentColor,
          stats: [
            ...(rating ? [{ label: "TMDB Rating", value: `${rating.toFixed(1)}/10` }] : []),
            { label: "Netflix via Axxess", value: "K70/month" },
            { label: "Prime via Axxess",   value: "K60/month" },
          ],
          readTime:      Math.floor(Math.random() * 2) + 2,
          controversial: Math.random() > 0.6,
          timestamp:     item.pubDate ?? new Date().toISOString(),
          cta,
          sourceUrl:     item.link,
        } as Article;
      })
    );

    return enrichArticles(articles);
  } catch {
    return enrichArticles(STATIC_ARTICLES);
  }
}

async function loadArticles(force: boolean): Promise<Article[]> {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
      if (c && Date.now() - c.ts < CACHE_TTL) return c.articles;
    } catch {}
  }
  const articles = await fetchLiveNews();
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), articles })); } catch {}
  return articles;
}

/* ─── Prefs ──────────────────────────────────────────────────────────────── */
const emptyPrefs = (): UserPrefs => ({ liked: [], bookmarked: [], viewed: [], categoryScores: {} });
function loadPrefs(): UserPrefs {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? emptyPrefs(); } catch { return emptyPrefs(); }
}
function savePrefs(p: UserPrefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} }
function addScore(p: UserPrefs, cat: string, d: number): UserPrefs {
  return { ...p, categoryScores: { ...p.categoryScores, [cat]: (p.categoryScores[cat] ?? 0) + d } };
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: "rgba(14,14,14,0.9)" }}>
      <div className="w-full h-48 bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 rounded-full bg-white/5" />
        <div className="h-5 w-4/5 rounded bg-white/5" />
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="flex gap-2 mt-2">
          <div className="h-8 w-20 rounded-full bg-white/5" />
          <div className="h-8 w-16 rounded-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Article Card — visual-first layout ─────────────────────────────────── */
function ArticleCard({ article, prefs, onLike, onBookmark, onView, onShare }: {
  article: Article; prefs: UserPrefs;
  onLike: (id: string) => void; onBookmark: (id: string) => void;
  onView: (id: string) => void; onShare: (a: Article) => void;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const liked      = prefs.liked.includes(article.id);
  const bookmarked = prefs.bookmarked.includes(article.id);
  const viewed     = prefs.viewed.includes(article.id);
  const cat        = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[1];
  const accent     = article.accentColor ?? cat.color;
  const coverImg   = article.backdropUrl ?? article.posterUrl;
  const coverIdx   = Math.abs(article.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COVER_GRADIENTS.length;

  const handleExpand = () => { setExpanded(true); onView(article.id); };

  return (
    <article
      className="relative overflow-hidden rounded-3xl transition-all duration-300"
      style={{
        background: "rgba(10,10,10,0.95)",
        border: `1px solid ${expanded ? accent + "50" : "rgba(255,255,255,0.07)"}`,
        boxShadow: expanded ? `0 0 60px -10px ${accent}30, 0 8px 32px rgba(0,0,0,0.5)` : "0 2px 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── VISUAL COVER — full width, grabs attention in 0.5s ── */}
      <div
        className="relative w-full overflow-hidden cursor-pointer"
        style={{ height: coverImg ? 220 : 120, background: coverImg ? "#000" : COVER_GRADIENTS[coverIdx] }}
        onClick={handleExpand}
      >
        {coverImg && (
          <img
            src={coverImg}
            alt={article.headline}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ opacity: 0.75 }}
            loading="lazy"
          />
        )}

        {/* Gradient overlay always */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.3) 60%, transparent 100%)" }} />

        {/* Controversial banner on image */}
        {article.controversial && (
          <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest" style={{ background: "linear-gradient(90deg, rgba(229,25,42,0.9), rgba(255,107,53,0.9))", backdropFilter: "blur(8px)" }}>
            <Flame className="h-3 w-3" style={{ color: "#fff" }} />
            <span style={{ color: "#fff" }}>Controversial take — you've been warned 👀</span>
          </div>
        )}

        {/* Play button if trailer exists */}
        {article.trailerKey && !showTrailer && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowTrailer(true); handleExpand(); }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full px-5 py-3 font-bold text-sm text-white transition-all hover:scale-105"
            style={{ background: "rgba(229,25,42,0.92)", backdropFilter: "blur(12px)", boxShadow: `0 0 32px ${accent}80` }}
          >
            <Play className="h-4 w-4" fill="white" /> Watch Trailer
          </button>
        )}

        {/* Poster thumbnail bottom-left if backdrop available */}
        {article.backdropUrl && article.posterUrl && (
          <img
            src={article.posterUrl}
            alt=""
            className="absolute bottom-3 left-3 h-16 w-11 rounded-lg object-cover shadow-xl"
            style={{ border: `2px solid ${accent}60` }}
          />
        )}

        {/* Category badge top-right */}
        <span
          className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
          style={{ background: accent + "cc", color: "#fff", backdropFilter: "blur(8px)" }}
        >
          {cat.label}
        </span>

        {/* Rating badge */}
        {article.rating && (
          <span
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black"
            style={{ background: "rgba(0,0,0,0.7)", color: "#C9A84C", backdropFilter: "blur(8px)" }}
          >
            ⭐ {article.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* ── TRAILER EMBED ── */}
      {showTrailer && article.trailerKey && (
        <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${article.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Trailer"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm"
            style={{ background: "rgba(0,0,0,0.85)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── TEXT CONTENT ── */}
      <div className="p-4">

        {/* Cast pills */}
        {article.cast && article.cast.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {article.cast.map((name) => (
              <span key={name} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: accent + "15", color: accent, border: `1px solid ${accent}25` }}>
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Headline */}
        <h2
          className="font-black leading-tight cursor-pointer transition-colors mb-2"
          style={{ fontSize: "clamp(15px, 3.5vw, 19px)", color: "#fff", lineHeight: 1.25 }}
          onClick={handleExpand}
        >
          {article.emoji} {article.headline}
        </h2>

        {/* Hook — italic, attention-grabbing */}
        <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 1.55 }}>
          {article.hook}
        </p>

        {/* Stats row */}
        {article.stats && article.stats.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {article.stats.map((s) => (
              <div key={s.label} className="rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="block text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                <span className="text-xs font-black text-white">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expanded body */}
        {expanded && (
          <div className="text-sm leading-relaxed space-y-3 pt-3 mb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.72)" }}>
            {article.body.split("\n\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}

            {/* Editor's hot take */}
            <div className="rounded-2xl p-4 mt-2" style={{ background: `linear-gradient(135deg, ${accent}12, transparent)`, border: `1px solid ${accent}30` }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: accent }}>🎙️ Axxess Editor's Hot Take</p>
              <p className="text-sm italic leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>"{article.opinion}"</p>
            </div>

            {/* CTA button */}
            {article.cta && (
              <a
                href={article.cta.url}
                className="flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all hover:opacity-90 mt-2"
                style={{ background: accent, color: "#fff", boxShadow: `0 0 24px -6px ${accent}80` }}
              >
                <Zap className="h-4 w-4" fill="currentColor" /> {article.cta.label}
              </a>
            )}

            {/* WhatsApp order shortcut */}
            <a
              href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hi Axxess! I just read about ${article.headline.slice(0, 50)} and I want to subscribe. Can you help me?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#25D366", color: "#fff" }}
            >
              <MessageCircle className="h-4 w-4" /> Subscribe via WhatsApp
            </a>

            {article.sourceUrl && (
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-[10px] transition-colors mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Original source ↗
              </a>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {!expanded && (
            <button
              onClick={handleExpand}
              className="flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition-all"
              style={{ background: accent, color: "#fff", boxShadow: `0 0 16px -4px ${accent}60` }}
            >
              Read <ChevronRight className="h-3 w-3" />
            </button>
          )}
          {article.trailerKey && !showTrailer && !expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowTrailer(true); handleExpand(); }}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold transition-all"
              style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.3)" }}
            >
              <Play className="h-3 w-3" /> Trailer
            </button>
          )}
          <button
            onClick={() => onLike(article.id)}
            className="flex items-center gap-1 rounded-full px-2.5 py-2 text-xs transition-all"
            style={{ background: liked ? "rgba(229,25,42,0.15)" : "rgba(255,255,255,0.05)", color: liked ? "#E5192A" : "rgba(255,255,255,0.4)", border: liked ? "1px solid rgba(229,25,42,0.3)" : "1px solid transparent" }}
          >
            <ThumbsUp className="h-3 w-3" /> {liked ? "Liked" : "Like"}
          </button>
          <button
            onClick={() => onBookmark(article.id)}
            className="flex items-center gap-1 rounded-full px-2.5 py-2 text-xs transition-all"
            style={{ background: bookmarked ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)", color: bookmarked ? "#C9A84C" : "rgba(255,255,255,0.4)", border: bookmarked ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent" }}
          >
            <BookmarkPlus className="h-3 w-3" /> {bookmarked ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => onShare(article)}
            className="flex items-center gap-1 rounded-full px-2.5 py-2 text-xs transition-all ml-auto"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          {viewed && <Eye className="h-3 w-3 ml-1" style={{ color: "rgba(255,255,255,0.15)" }} />}
        </div>
      </div>
    </article>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
function NewsPage() {
  const [articles,       setArticles]       = useState<Article[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [prefs,          setPrefs]          = useState<UserPrefs>(loadPrefs);
  const [refreshing,     setRefreshing]     = useState(false);
  const [shared,         setShared]         = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const load = useCallback(async (force: boolean) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setArticles(await loadArticles(force));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const handleRefresh = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} load(true); };

  const handleLike = (id: string) => {
    const a = articles.find((x) => x.id === id); if (!a) return;
    const p = loadPrefs(); const has = p.liked.includes(id);
    const up = { ...addScore(p, a.category, has ? -1 : 2), liked: has ? p.liked.filter((x) => x !== id) : [...p.liked, id] };
    savePrefs(up); setPrefs(up);
  };

  const handleBookmark = (id: string) => {
    const a = articles.find((x) => x.id === id); if (!a) return;
    const p = loadPrefs(); const has = p.bookmarked.includes(id);
    const up = { ...addScore(p, a.category, has ? -1 : 1), bookmarked: has ? p.bookmarked.filter((x) => x !== id) : [...p.bookmarked, id] };
    savePrefs(up); setPrefs(up);
  };

  const handleView = (id: string) => {
    const a = articles.find((x) => x.id === id); if (!a) return;
    const p = loadPrefs(); if (p.viewed.includes(id)) return;
    const up = { ...addScore(p, a.category, 1), viewed: [...p.viewed, id] };
    savePrefs(up); setPrefs(up);
  };

  const handleShare = (article: Article) => {
    const text = `${article.emoji} ${article.headline}\n\n${article.shareText}`;
    if (navigator.share) { navigator.share({ title: article.headline, text }).catch(() => {}); }
    else { navigator.clipboard.writeText(text).catch(() => {}); setShared(article.id); setTimeout(() => setShared(null), 2000); }
  };

  const filtered = activeCategory === "all" ? articles : articles.filter((a) => a.category === activeCategory);
  const sorted   = [...filtered].sort((a, b) =>
    ((prefs.categoryScores[b.category] ?? 0) + (b.controversial ? 2 : 0)) -
    ((prefs.categoryScores[a.category] ?? 0) + (a.controversial ? 2 : 0))
  );
  const savedArticles = articles.filter((a) => prefs.bookmarked.includes(a.id));

  return (
    <SiteShell>
      <div className="min-h-screen" style={{ background: "#080808" }}>

        {/* ── Hero header ── */}
        <div className="relative overflow-hidden px-4 pt-8 pb-6 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(229,25,42,0.1) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mx-auto max-w-3xl flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em]" style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#E5192A", display: "inline-block" }} />
                  Live · Updated daily
                </span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {new Date().toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
              <h1 className="font-black leading-none" style={{ fontSize: "clamp(36px, 9vw, 56px)", letterSpacing: "-2.5px", color: "#fff" }}>
                Axxess{" "}
                <span style={{ background: "linear-gradient(135deg, #E5192A 0%, #FF6B35 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  News
                </span>
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Hot takes. Real visuals. Zero boring. ☕
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all shrink-0"
              style={{ background: "rgba(229,25,42,0.08)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Loading..." : "Fresh"}
            </button>
          </div>
          {Object.keys(prefs.categoryScores).length > 0 && (
            <div className="mt-3 mx-auto max-w-3xl flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(255,255,255,0.4)" }}>
              <Sparkles className="h-3 w-3 shrink-0" style={{ color: "#C9A84C" }} />
              Feed personalised from your reading habits
            </div>
          )}
        </div>

        {/* ── Sticky category tabs ── */}
        <div className="sticky top-[60px] z-30 overflow-x-auto scrollbar-none" style={{ background: "rgba(8,8,8,0.97)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
          <div className="flex gap-1 px-4 py-2.5 min-w-max sm:px-6">
            {CATEGORIES.map((cat) => {
              const count  = cat.id === "all" ? articles.length : articles.filter((a) => a.category === cat.id).length;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: active ? cat.color : "rgba(255,255,255,0.04)",
                    color:      active ? "#fff"     : "rgba(255,255,255,0.45)",
                    border:     active ? "none"     : "1px solid rgba(255,255,255,0.07)",
                    boxShadow:  active ? `0 0 20px -4px ${cat.color}60` : "none",
                    transform:  active ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {cat.label}
                  {count > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)", color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sticky conversion banner ── */}
        {!bannerDismissed && !loading && articles.length > 0 && (
          <div className="sticky top-[108px] z-20 px-4 py-2 sm:px-6" style={{ background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)" }}>
            <div className="mx-auto max-w-3xl flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5" style={{ background: "linear-gradient(90deg, rgba(229,25,42,0.12), rgba(201,168,76,0.08))", border: "1px solid rgba(229,25,42,0.2)" }}>
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                🎬 Everything you're reading about — watch it.{" "}
                <a href="/#plans" className="font-black underline" style={{ color: "#E5192A" }}>Netflix K70 · Prime K60</a>
              </p>
              <button onClick={() => setBannerDismissed(true)} className="shrink-0 text-white/30 hover:text-white/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Saved strip ── */}
        {savedArticles.length > 0 && (
          <div className="px-4 py-3 sm:px-6 border-b" style={{ borderColor: "rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
            <div className="mx-auto max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#C9A84C" }}>
                <BookmarkPlus className="inline h-3 w-3 mr-1" />Saved
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {savedArticles.map((a) => (
                  <span key={a.id} className="rounded-xl px-3 py-1.5 text-xs whitespace-nowrap font-semibold" style={{ background: "rgba(201,168,76,0.08)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(201,168,76,0.15)" }}>
                    {a.emoji} {a.headline.length > 30 ? a.headline.slice(0, 30) + "…" : a.headline}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Share toast ── */}
        {shared && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: "#E5192A", color: "#fff", boxShadow: "0 8px 32px rgba(229,25,42,0.5)" }}>
            Copied! Share the tea ☕
          </div>
        )}

        {/* ── Articles grid ── */}
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 space-y-4">
          {loading && (
            <>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              <p className="text-center text-xs py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Sparkles className="inline h-3 w-3 mr-1" />Loading visuals + trailers...
              </p>
            </>
          )}

          {!loading && sorted.map((article) => (
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

          {!loading && sorted.length === 0 && (
            <p className="text-center py-16 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Nothing in this category right now.
            </p>
          )}

          {!loading && sorted.length > 0 && (
            <div className="text-center pt-4 pb-10 space-y-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                style={{ background: "rgba(229,25,42,0.08)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.2)" }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Getting fresh tea..." : "Load new stories ☕"}
              </button>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Feed personalises to your taste over time
              </p>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
  }
