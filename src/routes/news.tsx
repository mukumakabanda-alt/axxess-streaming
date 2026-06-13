import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Flame, RefreshCw, Play, Share2, BookmarkPlus,
  ChevronRight, Eye, ThumbsUp, Clock, Sparkles, Zap,
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

/* ─── Types ───────────────────────────────────────────────────────────────── */
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
  cta?: { label: string; url: string };
  sourceUrl?: string;
};

type UserPrefs = {
  liked: string[];
  bookmarked: string[];
  viewed: string[];
  categoryScores: Record<string, number>;
};

/* ─── Constants ───────────────────────────────────────────────────────────── */
const NEWSDATA_KEY = (import.meta as any).env?.VITE_NEWSDATA_KEY ?? "pub_528ce14853854ade8b07e37ff6146996";
const TMDB_KEY = (import.meta as any).env?.VITE_TMDB_KEY ?? "a88d5ae60c54ee1720dd60feda898521";
const PREFS_KEY = "axx_news_prefs_v3";
const CACHE_KEY = "axx_news_cache_v5";
const CACHE_TTL = 1000 * 60 * 45;

const CATEGORIES = [
  { id: "all",    label: "🔥 All",     color: "#E5192A" },
  { id: "hot",    label: "⚡ Hot",     color: "#FF6B35" },
  { id: "zambia", label: "🇿🇲 Zambia", color: "#198754" },
  { id: "axxess", label: "🎯 Axxess",  color: "#C9A84C" },
  { id: "series", label: "📺 Series",  color: "#7C3AED" },
  { id: "movies", label: "🎬 Movies",  color: "#0EA5E9" },
  { id: "tea",    label: "☕ Tea",     color: "#EC4899" },
] as const;

/* ─── TMDB enrichment ─────────────────────────────────────────────────────── */
const TMDB_SHOWS: Record<string, { id: number; type: "movie" | "tv" }> = {
  "stranger things": { id: 66732, type: "tv" },
  "the boys": { id: 76479, type: "tv" },
  "squid game": { id: 93405, type: "tv" },
  "wednesday": { id: 119051, type: "tv" },
  "fallout": { id: 106379, type: "tv" },
  "citadel": { id: 126108, type: "tv" },
  "outer banks": { id: 79744, type: "tv" },
  "baby reindeer": { id: 224136, type: "tv" },
  "the grand tour": { id: 61621, type: "tv" },
  "reginald the vampire": { id: 136153, type: "tv" },
};

async function fetchTMDB(id: number, type: "movie" | "tv") {
  try {
    const [details, videos] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}`).then((r) => r.json()),
      fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_KEY}`).then((r) => r.json()),
    ]);
    const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined;
    const trailer = (videos.results ?? []).find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    );
    return { poster, trailerKey: trailer?.key ?? null, rating: details.vote_average };
  } catch { return null; }
}

/* ─── Zambian editorial voice ─────────────────────────────────────────────── */
const ZAMBIAN_ANGLES: Record<string, string> = {
  netflix: "Netflix Zambia is real now — no need to beg your cousin in UK for their login. Axxess has you at K70/month.",
  prime: "Amazon Prime Video hits different when you're watching at home in Lusaka. Get it for K60/month via Axxess.",
  dstv: "DStv has been in Zambian homes since before some of us were born. Reserve your slot at Axxess.",
  streaming: "Meanwhile Zambians are out here watching on mobile data like champions. Axxess keeps it affordable.",
  default: "Zambia is streaming. The question is — are you getting yours for the right price? Axxess has the answer.",
};

const CONVERSION_CTAS = [
  { label: "Watch on Netflix — K70/mo", url: "/#plans" },
  { label: "Watch on Prime Video — K60/mo", url: "/#plans" },
  { label: "Get All Access — K140/mo", url: "/#plans" },
  { label: "Start Free Trial", url: "/trial" },
  { label: "Reserve Your Slot", url: "/reserve" },
];

function getZambianAngle(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("netflix")) return ZAMBIAN_ANGLES.netflix;
  if (t.includes("prime")) return ZAMBIAN_ANGLES.prime;
  if (t.includes("dstv")) return ZAMBIAN_ANGLES.dstv;
  if (t.includes("stream")) return ZAMBIAN_ANGLES.streaming;
  return ZAMBIAN_ANGLES.default;
}

function getCTA(text: string): { label: string; url: string } {
  const t = text.toLowerCase();
  if (t.includes("prime")) return CONVERSION_CTAS[1];
  if (t.includes("all access") || t.includes("bundle")) return CONVERSION_CTAS[2];
  if (t.includes("trial")) return CONVERSION_CTAS[3];
  if (t.includes("dstv") || t.includes("reserve")) return CONVERSION_CTAS[4];
  return CONVERSION_CTAS[0];
}

function getCategory(text: string): Article["category"] {
  const t = text.toLowerCase();
  if (t.includes("zambi") || t.includes("lusaka") || t.includes("african")) return "zambia";
  if (t.includes("axxess")) return "axxess";
  if (t.includes("season") || t.includes("series") || t.includes("episode")) return "series";
  if (t.includes("movie") || t.includes("film") || t.includes("cinema")) return "movies";
  if (t.includes("celebrity") || t.includes("drama") || t.includes("beef") || t.includes("feud")) return "tea";
  return "hot";
}

function makeShareText(headline: string, hook: string): string {
  return `😮 ${headline}\n\n${hook}\n\n👀 Read + watch on Axxess News`;
}

function makeHook(description: string, title: string): string {
  if (description && description.length > 30) return description;
  return `${title} just dropped and the internet is not ready for this.`;
}

function makeBody(article: any, zambianAngle: string): string {
  const desc = article.description || article.content || "";
  const source = article.source_id || "sources";
  return `${desc}\n\n${article.content && article.content !== desc ? article.content.slice(0, 400) + "..." : ""}\n\n🇿🇲 *The Zambian angle:* ${zambianAngle}`.trim();
}

function makeOpinion(title: string): string {
  const opinions = [
    `If this doesn't make you want to open Netflix right now, I don't know what will. And if you don't have Netflix yet — fix that. K70/month. No excuses.`,
    `This is exactly the kind of content Zambians deserve access to. The price used to be the barrier. Axxess fixed that.`,
    `The show is elite. The access should be too. Axxess — K70 Netflix, K60 Prime, K140 both.`,
    `My controversial take: if you're not watching this, your entertainment taste needs a serious upgrade.`,
    `Zambia has always had taste. Now we just need the access. That's what Axxess is for.`,
    `Hotly debated but I'll say it — this is better than anything on free TV. Worth every ngwee of that K70.`,
  ];
  return opinions[Math.floor(Math.random() * opinions.length)];
}

/* ─── Static fallback articles ────────────────────────────────────────────── */
const STATIC_ARTICLES: Article[] = [
  {
    id: "stranger-things-5-final",
    headline: "Stranger Things Season 5 Is The Actual End — Netflix Is Not Playing Around",
    hook: "The Duffer Brothers confirmed this is it. No spin-offs, no reboots. Hawkins dies with this season and we are not emotionally prepared.",
    body: "Netflix dropped the first official teaser for Stranger Things Season 5 and the internet collectively held its breath. The show that made everyone afraid of Christmas lights is coming back for one final chapter.\n\nThe teaser shows Eleven looking older, more powerful, and honestly terrifying. Hopper is back from Russia. Vecna appears to have won — at least temporarily.\n\nNetflix confirmed the season will be the longest ever, with episodes reportedly running over an hour. No filler. No budget cuts. This is their goodbye gift to one of the most culturally defining shows of the streaming era.\n\n🇿🇲 *The Zambian angle:* Zambians have been watching Stranger Things since Season 1 on borrowed passwords and dodgy streams. Now you can watch the final season properly — K70/month for Netflix via Axxess. No more borrowing.",
    opinion: "If this season doesn't make me cry at least twice, I'm filing a formal complaint. My controversial take: Will Byers was the most important character the entire time and nobody talked about it.",
    category: "hot",
    emoji: "🔮",
    shareText: "Stranger Things Season 5 is the FINAL season 😭🔮 The Duffer Brothers said no spin-offs, no reboots. Just finality. Watch on Netflix via Axxess — K70/month",
    tmdbId: 66732,
    tmdbType: "tv",
    stats: [
      { label: "Season 4 views", value: "1.35 billion hours" },
      { label: "Countries it trended", value: "93" },
      { label: "Netflix price via Axxess", value: "K70/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get Netflix — K70/mo", url: "/#plans" },
  },
  {
    id: "the-boys-s5-filming",
    headline: "The Boys Season 5 Is Filming And Someone Finally Beats Homelander — We Think",
    hook: "Set photos leaked. Jensen Ackles is back. And the showrunner casually said someone makes Homelander 'look like a golden retriever.' We need to talk.",
    body: "The Boys has been Prime Video's most unhinged show since 2019 and Season 5 is shaping up to be the most chaotic yet. Production is officially underway and Jensen Ackles returns as Soldier Boy.\n\nShowrunner Eric Kripke hinted at a new villain who will 'make Homelander look like a golden retriever.' In a show where Homelander nuked a crowd and faced zero consequences — those are serious fighting words.\n\nThe entire cast described the finale as 'emotionally devastating.' They always say this. But somehow The Boys always delivers.\n\n🇿🇲 *The Zambian angle:* The Boys is basically a documentary about powerful people with no accountability. Zambians understand this energy deeply. Watch it on Prime Video — K60/month via Axxess.",
    opinion: "Homelander is just a Zambian politician with a cape and laser eyes. The Boys is not entertainment — it's political education. My hot take: Billy Butcher is the real villain and always has been.",
    category: "series",
    emoji: "💥",
    shareText: "The Boys Season 5 is filming and apparently someone FINALLY beats Homelander 💥 This is the one. Prime Video via Axxess — K60/month",
    tmdbId: 76479,
    tmdbType: "tv",
    stats: [
      { label: "Season 4 viewers", value: "65M households" },
      { label: "Prime Video subscribers", value: "200M+" },
      { label: "Prime Video via Axxess", value: "K60/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get Prime Video — K60/mo", url: "/#plans" },
  },
  {
    id: "squid-game-3-confirmed",
    headline: "Squid Game Season 3 Is Already In Post-Production And We Are Not Ready",
    hook: "Netflix confirmed Season 3 is coming and based on how Season 2 ended, this is either going to be the greatest finale in streaming history or the most devastating.",
    body: "Squid Game Season 3 is confirmed and already in post-production. Creator Hwang Dong-hyuk described it as the 'inevitable conclusion' to Gi-hun's arc.\n\nSeason 2 broke Netflix viewing records and became one of the most watched non-English shows ever. It was watched in 93 countries and sparked massive debate about its ending — which was either brilliant or deeply unsatisfying depending on who you ask.\n\nIn Zambia, Squid Game became a cultural reference point overnight. 'Red light, green light' entered everyday conversation. The show transcended language and culture in a way very few pieces of content ever do.\n\n🇿🇲 *The Zambian angle:* Zambia already has its own version of Squid Game — it's called 'looking for jobs after graduation.' Dark? Yes. Relatable? Extremely. Watch the actual show on Netflix via Axxess.",
    opinion: "Squid Game Season 2 ended like a Zambian exam — you thought you were done and then there was a whole second page. My controversial take: the games are not the point. The people running them are.",
    category: "hot",
    emoji: "🦑",
    shareText: "Squid Game Season 3 is in post-production already 🦑 After that Season 2 ending??? We are NOT ready 😭 Netflix via Axxess — K70/month",
    tmdbId: 93405,
    tmdbType: "tv",
    stats: [
      { label: "Season 2 first week", value: "68M households" },
      { label: "Countries in top 10", value: "93" },
      { label: "Your Netflix price", value: "K70/month" },
    ],
    readTime: 2,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch Squid Game on Netflix", url: "/#plans" },
  },
  {
    id: "zambia-streaming-stats",
    headline: "Zambia Is Now A Streaming Nation — And These Numbers Will Shock You",
    hook: "A new report confirmed Zambians spent 67% more time streaming in 2024 than 2023. The streaming revolution is not coming — it already arrived.",
    body: "Data from across Sub-Saharan Africa confirms what WhatsApp group admins already knew — Zambians are streaming seriously now. Mobile data usage for video streaming in Zambia grew 67% in 2024, driven by improved 4G coverage and more affordable bundles from MTN and Airtel.\n\nNetflix leads for premium content. Prime Video is gaining fast, especially for original series. DStv remains dominant for live football and local African content.\n\nOver 78% of streaming in Zambia happens on a smartphone. People watch during lunch, on minibuses, at the saloon, in the office during slow afternoons. Streaming has become Zambia's new radio.\n\nThe biggest barrier remains cost — official subscriptions are priced in dollars. Axxess exists to fix exactly this: Netflix at K70, Prime Video at K60, both platforms for K140.",
    opinion: "The data says Zambia is ready. The question is just whether you're watching on a dodgy stream or a proper account. Get a proper account. You deserve better quality.",
    category: "zambia",
    emoji: "🇿🇲",
    shareText: "Zambia's streaming consumption grew 67% in 2024 🇿🇲 We are officially a streaming nation. And Axxess makes it affordable — Netflix K70, Prime K60 🔥",
    stats: [
      { label: "Streaming growth 2024", value: "+67%" },
      { label: "Mobile streaming share", value: "78%" },
      { label: "Both platforms via Axxess", value: "K140/month" },
    ],
    readTime: 3,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Join the movement — K70/mo", url: "/#plans" },
  },
  {
    id: "fallout-season-2",
    headline: "Fallout Season 2 Is Coming And Prime Video Is Betting Everything On It",
    hook: "Amazon greenlit Fallout Season 2 faster than any show in Prime history. They know what they have. The question is whether Season 2 can live up to the impossible standard of Season 1.",
    body: "Fallout Season 1 was the surprise hit of 2024. A show based on a video game — a genre with a historically terrible success rate — somehow became must-watch TV for people who had never touched a controller in their lives.\n\nAmazon Prime Video responded by fast-tracking Season 2 into production. The showrunners confirmed the story moves west, deeper into the wasteland, with new factions and new horrors.\n\nWalton Goggins as The Ghoul was genuinely one of the best TV performances of 2024. The man ate every scene he was in and asked for seconds.\n\n🇿🇲 *The Zambian angle:* A post-apocalyptic wasteland where corporations control everything and regular people suffer? Zambians understand this cinematic universe on a spiritual level. Watch it on Prime Video — K60/month via Axxess.",
    opinion: "Fallout Season 1 is better than 90% of superhero content made in the last decade. That's not a take — that's a fact. And if you haven't watched it yet, what are you actually doing with your life?",
    category: "series",
    emoji: "☢️",
    shareText: "Fallout Season 2 is officially in production 🎉☢️ Season 1 was ELITE and they're going even bigger. Prime Video via Axxess — K60/month",
    tmdbId: 106379,
    tmdbType: "tv",
    stats: [
      { label: "Season 1 viewers (week 1)", value: "65M households" },
      { label: "IMDb rating", value: "8.5/10" },
      { label: "Prime Video via Axxess", value: "K60/month" },
    ],
    readTime: 3,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch Fallout on Prime — K60/mo", url: "/#plans" },
  },
  {
    id: "axxess-all-access-case",
    headline: "Why Paying K140 For Both Netflix AND Prime Video Is Actually The Smartest Move",
    hook: "You're spending K70 on Netflix. Your friend is spending K60 on Prime. You're both missing half the shows. There's a smarter way and it only costs K140.",
    body: "Let's do the maths. Netflix has Stranger Things, Squid Game, Wednesday, Outer Banks. Prime Video has The Boys, Fallout, The Grand Tour, Citadel. You need both.\n\nAxxess All Access gives you both platforms for K140 a month. That's less than most people spend on airtime in a week. It's less than one takeout meal from a decent restaurant in Lusaka.\n\nFor K140 you unlock: every Netflix original, every Prime Video original, both streaming libraries, both new releases. Activated via WhatsApp in 15 minutes. No card. No contract. No stress.\n\nThe All Access bundle is our most popular plan. Once people try it, they never go back to single-platform.",
    opinion: "Choosing between Netflix and Prime Video in 2025 is like choosing between lunch and dinner. You need both. K140 a month. Stop playing with yourself.",
    category: "axxess",
    emoji: "🎯",
    shareText: "Netflix K70 + Prime Video K60 = K130 separately. Or K140 for BOTH via Axxess All Access 🤯 The maths literally don't miss. Get it at axxess-streaming.lovable.app",
    stats: [
      { label: "Netflix only", value: "K70/month" },
      { label: "Prime Video only", value: "K60/month" },
      { label: "Both with All Access", value: "K140/month" },
    ],
    readTime: 2,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Get All Access — K140/mo", url: "/#plans" },
  },
  {
    id: "wednesday-season-2",
    headline: "Wednesday Season 2 Looks Darker, Weirder, And Honestly More Wednesday Than Season 1",
    hook: "Netflix dropped the first Wednesday Season 2 teaser and Jenna Ortega looks like she's done being polite. The Addams family energy is fully unleashed and we are here for it.",
    body: "Wednesday Season 1 became one of Netflix's biggest shows ever — over 1.2 billion hours viewed in its first month. The pressure on Season 2 is immense.\n\nFrom what Netflix has shown so far, Season 2 leans harder into the supernatural elements, introduces new characters to Nevermore Academy, and appears to give Wednesday a genuine character arc rather than just quirky one-liners.\n\nJenna Ortega has become one of the biggest stars in the world off the back of this role. Her commitment to the character — the deadpan delivery, the refusal to smile — is genuinely impressive comedic and dramatic work.\n\n🇿🇲 *The Zambian angle:* Wednesday Addams not smiling and refusing to conform while everyone around her tries to make her normal? That's literally every brilliant Zambian student who was told to 'fit in.' Wednesday is Zambian energy.",
    opinion: "Season 1 was good but felt like it was holding back. Season 2 looks like they finally let Jenna Ortega do whatever she wanted. That's always when great TV happens.",
    category: "series",
    emoji: "🖤",
    shareText: "Wednesday Season 2 looks UNHINGED in the best way 🖤 Jenna Ortega said no more playing nice. Netflix via Axxess — K70/month. Don't miss this.",
    tmdbId: 119051,
    tmdbType: "tv",
    stats: [
      { label: "Season 1 views (month 1)", value: "1.2 billion hours" },
      { label: "IMDb rating", value: "8.1/10" },
      { label: "Your Netflix price", value: "K70/month" },
    ],
    readTime: 2,
    controversial: false,
    timestamp: new Date().toISOString(),
    cta: { label: "Watch Wednesday on Netflix", url: "/#plans" },
  },
  {
    id: "streaming-vs-dstv-zambia",
    headline: "Netflix vs DStv in Zambia — An Honest, Slightly Controversial Breakdown",
    hook: "Zambian households have been loyal to DStv for 30 years. Now Netflix and Prime Video are competing for that same living room. Here's the honest truth about both.",
    body: "DStv has been in Zambian homes since before some of us were born. It's familiar. It has local content. It has live football. These are real advantages that streaming services haven't fully matched yet.\n\nBut Netflix and Prime Video have fundamentally different strengths: on-demand viewing, better original content, no signal disruption during rain, and — through Axxess — much more affordable pricing.\n\nThe honest answer is that most Zambian households will end up with both. DStv for live sports and local African content. Netflix or Prime for everything else. The question is just how you manage the cost.\n\nAxxess solves the streaming side. Netflix at K70, Prime Video at K60, or both for K140. DStv you sort separately. But your entertainment world becomes significantly larger.",
    opinion: "DStv and Netflix are not competitors — they're complements. Any Zambian household that has both is simply winning at entertainment. My controversial take: SuperSport alone justifies DStv. Everything else, go streaming.",
    category: "zambia",
    emoji: "📺",
    shareText: "Netflix vs DStv in Zambia 🇿🇲📺 Honest breakdown: they're not competitors, they're complements. And Axxess makes the streaming side affordable. K70 Netflix, K60 Prime.",
    stats: [
      { label: "DStv years in Zambia", value: "30+" },
      { label: "Netflix Zambia users est.", value: "Growing fast" },
      { label: "Netflix via Axxess", value: "K70/month" },
    ],
    readTime: 3,
    controversial: true,
    timestamp: new Date().toISOString(),
    cta: { label: "Get streaming sorted — K70/mo", url: "/#plans" },
  },
];

/* ─── NewsData.io fetcher ─────────────────────────────────────────────────── */
async function fetchLiveNews(): Promise<Article[]> {
  try {
    const queries = [
      "Netflix series season",
      "Amazon Prime Video show",
      "streaming entertainment",
    ];
    const query = queries[Math.floor(Math.random() * queries.length)];
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${encodeURIComponent(query)}&language=en&category=entertainment&size=8`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NewsData ${res.status}`);
    const data = await res.json();
    const items = data.results ?? [];
    if (!items.length) throw new Error("No articles returned");

    const articles: Article[] = await Promise.all(
      items.slice(0, 8).map(async (item: any, i: number) => {
        const title: string = item.title ?? "Untitled";
        const desc: string = item.description ?? item.content ?? "";
        const category = getCategory(title + " " + desc);
        const zambianAngle = getZambianAngle(title + " " + desc);
        const hook = makeHook(desc, title);
        const body = makeBody(item, zambianAngle);
        const shareText = makeShareText(title, hook);
        const opinion = makeOpinion(title);
        const cta = getCTA(title + " " + desc);

        const titleLower = title.toLowerCase();
        let posterUrl: string | undefined;
        let trailerKey: string | undefined;
        let tmdbId: number | undefined;
        let tmdbType: "movie" | "tv" | undefined;
        let rating: number | undefined;

        for (const [keyword, tmdb] of Object.entries(TMDB_SHOWS)) {
          if (titleLower.includes(keyword) || desc.toLowerCase().includes(keyword)) {
            const result = await fetchTMDB(tmdb.id, tmdb.type);
            if (result) {
              posterUrl = result.poster;
              trailerKey = result.trailerKey ?? undefined;
              tmdbId = tmdb.id;
              tmdbType = tmdb.type;
              rating = result.rating;
            }
            break;
          }
        }

        const emojis = ["🔥", "⚡", "💥", "🎬", "📺", "☕", "👀", "🎯", "🇿🇲", "🦑"];

        return {
          id: `live-${i}-${Date.now()}`,
          headline: title,
          hook,
          body,
          opinion,
          category,
          emoji: emojis[i % emojis.length],
          shareText,
          tmdbId,
          tmdbType,
          posterUrl,
          trailerKey,
          stats: [
            ...(rating ? [{ label: "IMDb/TMDB Rating", value: `${rating.toFixed(1)}/10` }] : []),
            { label: "Netflix via Axxess", value: "K70/month" },
            { label: "Prime via Axxess", value: "K60/month" },
          ],
          readTime: Math.floor(Math.random() * 2) + 2,
          controversial: Math.random() > 0.65,
          timestamp: item.pubDate ?? new Date().toISOString(),
          cta,
          sourceUrl: item.link,
        } as Article;
      })
    );

    return articles;
  } catch (err) {
    console.warn("NewsData.io failed, using static articles:", err);
    return STATIC_ARTICLES;
  }
}

/* ─── Main load function ──────────────────────────────────────────────────── */
async function loadArticles(forceRefresh: boolean): Promise<Article[]> {
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.articles;
    } catch {}
  }
  const articles = await fetchLiveNews();
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), articles })); } catch {}
  return articles;
}

/* ─── Preference helpers ──────────────────────────────────────────────────── */
function loadPrefs(): UserPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? { liked: [], bookmarked: [], viewed: [], categoryScores: {} };
  } catch { return { liked: [], bookmarked: [], viewed: [], categoryScores: {} }; }
}
function savePrefs(p: UserPrefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} }
function scoreCategory(p: UserPrefs, cat: string, delta: number): UserPrefs {
  const scores = { ...p.categoryScores };
  scores[cat] = (scores[cat] ?? 0) + delta;
  return { ...p, categoryScores: scores };
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 animate-pulse" style={{ background: "rgba(12,12,12,0.85)" }}>
      <div className="flex">
        <div className="w-24 sm:w-32 bg-white/5 shrink-0" style={{ minHeight: 140 }} />
        <div className="flex-1 p-4 space-y-3">
          <div className="flex gap-2"><div className="h-4 w-16 rounded-full bg-white/5" /><div className="h-4 w-12 rounded-full bg-white/5" /></div>
          <div className="h-5 w-4/5 rounded bg-white/5" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="flex gap-2"><div className="h-7 w-16 rounded-full bg-white/5" /><div className="h-7 w-14 rounded-full bg-white/5" /></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Article Card ────────────────────────────────────────────────────────── */
function ArticleCard({ article, prefs, onLike, onBookmark, onView, onShare }: {
  article: Article; prefs: UserPrefs;
  onLike: (id: string) => void; onBookmark: (id: string) => void;
  onView: (id: string) => void; onShare: (a: Article) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const liked = prefs.liked.includes(article.id);
  const bookmarked = prefs.bookmarked.includes(article.id);
  const viewed = prefs.viewed.includes(article.id);
  const cat = CATEGORIES.find((c) => c.id === article.category) ?? CATEGORIES[1];

  const handleExpand = () => { setExpanded(true); onView(article.id); };

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        background: "rgba(12,12,12,0.85)",
        borderColor: expanded ? cat.color + "40" : "rgba(255,255,255,0.06)",
        boxShadow: expanded ? `0 0 40px ${cat.color}15, 0 4px 24px rgba(0,0,0,0.4)` : "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {article.controversial && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ background: "linear-gradient(90deg, #E5192A, #FF6B35)", color: "#fff" }}>
          <Flame className="h-3 w-3" /> Controversial — read with caution 👀
        </div>
      )}

      <div className="flex">
        {article.posterUrl && (
          <div className="shrink-0 w-24 sm:w-32 relative overflow-hidden">
            <img src={article.posterUrl} alt={article.headline} className="h-full w-full object-cover" style={{ minHeight: 140 }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c0c0c]" />
            {article.trailerKey && !expanded && (
              <button onClick={() => { setShowTrailer(true); handleExpand(); }} className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(229,25,42,0.9)", boxShadow: "0 0 20px rgba(229,25,42,0.6)" }}>
                  <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                </span>
              </button>
            )}
          </div>
        )}

        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: cat.color + "20", color: cat.color, border: `1px solid ${cat.color}30` }}>
              {cat.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/30"><Clock className="h-2.5 w-2.5" /> {article.readTime} min</span>
            {viewed && <span className="flex items-center gap-1 text-[10px] text-white/20"><Eye className="h-2.5 w-2.5" /> Read</span>}
          </div>

          <h2 className="font-bold leading-tight mb-1.5 cursor-pointer hover:text-[#E5192A] transition-colors" style={{ fontSize: "clamp(14px, 3vw, 17px)", color: "rgba(255,255,255,0.95)" }} onClick={handleExpand}>
            {article.emoji} {article.headline}
          </h2>

          <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>
            {article.hook}
          </p>

          {article.stats && article.stats.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {article.stats.map((s) => (
                <div key={s.label} className="rounded-lg px-2.5 py-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[10px] text-white/30 block">{s.label}</span>
                  <span className="text-xs font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {expanded && (
            <div className="text-sm leading-relaxed space-y-3 mb-4 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}>
              {article.body.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <div className="rounded-xl p-3 mt-3" style={{ background: `linear-gradient(135deg, ${cat.color}10, transparent)`, border: `1px solid ${cat.color}25` }}>
                <p className="text-xs font-bold mb-1" style={{ color: cat.color }}>🎙️ Axxess Editor's Take</p>
                <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.7)" }}>"{article.opinion}"</p>
              </div>
              {article.cta && (
                <a href={article.cta.url} className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold mt-3 transition-all hover:opacity-90" style={{ background: "#E5192A", color: "#fff" }}>
                  <Zap className="h-4 w-4" fill="currentColor" /> {article.cta.label}
                </a>
              )}
              {article.sourceUrl && (
                <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-[10px] text-white/20 hover:text-white/40 transition-colors mt-1">
                  Original source ↗
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            {!expanded && (
              <button onClick={handleExpand} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all" style={{ background: "#E5192A", color: "#fff" }}>
                Read <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <button onClick={() => onLike(article.id)} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all" style={{ background: liked ? "rgba(229,25,42,0.15)" : "rgba(255,255,255,0.05)", color: liked ? "#E5192A" : "rgba(255,255,255,0.4)", border: liked ? "1px solid rgba(229,25,42,0.3)" : "1px solid transparent" }}>
              <ThumbsUp className="h-3 w-3" /> {liked ? "Liked" : "Like"}
            </button>
            <button onClick={() => onBookmark(article.id)} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all" style={{ background: bookmarked ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)", color: bookmarked ? "#C9A84C" : "rgba(255,255,255,0.4)", border: bookmarked ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent" }}>
              <BookmarkPlus className="h-3 w-3" /> {bookmarked ? "Saved" : "Save"}
            </button>
            <button onClick={() => onShare(article)} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
              <Share2 className="h-3 w-3" /> Share
            </button>
            {article.trailerKey && !showTrailer && (
              <button onClick={() => { setShowTrailer(true); handleExpand(); }} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all" style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}>
                <Play className="h-3 w-3" /> Trailer
              </button>
            )}
          </div>
        </div>
      </div>

      {showTrailer && article.trailerKey && (
        <div className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="aspect-video w-full">
            <iframe src={`https://www.youtube.com/embed/${article.trailerKey}?autoplay=1&rel=0&modestbranding=1`} title="Trailer" allow="autoplay; encrypted-media" allowFullScreen className="h-full w-full" />
          </div>
          <button onClick={() => setShowTrailer(false)} className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: "rgba(0,0,0,0.8)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>✕</button>
        </div>
      )}
    </article>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [refreshing, setRefreshing] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    try {
      if (force) setRefreshing(true); else setLoading(true);
      const data = await loadArticles(force);
      setArticles(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const handleRefresh = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} load(true); };

  const handleLike = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const p = loadPrefs();
    const already = p.liked.includes(id);
    const updated = { ...scoreCategory(p, article.category, already ? -1 : 2), liked: already ? p.liked.filter((x) => x !== id) : [...p.liked, id] };
    savePrefs(updated); setPrefs(updated);
  };

  const handleBookmark = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const p = loadPrefs();
    const already = p.bookmarked.includes(id);
    const updated = { ...scoreCategory(p, article.category, already ? -1 : 1), bookmarked: already ? p.bookmarked.filter((x) => x !== id) : [...p.bookmarked, id] };
    savePrefs(updated); setPrefs(updated);
  };

  const handleView = (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const p = loadPrefs();
    if (p.viewed.includes(id)) return;
    const updated = { ...scoreCategory(p, article.category, 1), viewed: [...p.viewed, id] };
    savePrefs(updated); setPrefs(updated);
  };

  const handleShare = (article: Article) => {
    const text = `${article.emoji} ${article.headline}\n\n${article.shareText}\n\n📲 More on Axxess News: axxess-streaming.lovable.app/news`;
    if (navigator.share) { navigator.share({ title: article.headline, text }).catch(() => {}); }
    else { navigator.clipboard.writeText(text).catch(() => {}); setShared(article.id); setTimeout(() => setShared(null), 2000); }
  };

  const filtered = activeCategory === "all" ? articles : articles.filter((a) => a.category === activeCategory);
  const sorted = [...filtered].sort((a, b) => {
    const sA = (prefs.categoryScores[a.category] ?? 0) + (a.controversial ? 2 : 0);
    const sB = (prefs.categoryScores[b.category] ?? 0) + (b.controversial ? 2 : 0);
    return sB - sA;
  });
  const bookmarkedArticles = articles.filter((a) => prefs.bookmarked.includes(a.id));

  return (
    <SiteShell>
      <div className="min-h-screen" style={{ background: "#080808" }}>

        {/* Hero header */}
        <div className="relative overflow-hidden px-4 pt-8 pb-6 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(229,25,42,0.08) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em]" style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#E5192A", animation: "newsDot 2s ease infinite", display: "inline-block" }} />
                    Live · Updated daily
                  </span>
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">
                    {new Date().toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
                <h1 className="font-black leading-none" style={{ fontSize: "clamp(32px, 8vw, 52px)", letterSpacing: "-2px", color: "#fff" }}>
                  Axxess{" "}
                  <span style={{ background: "linear-gradient(135deg, #E5192A, #FF6B35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>News</span>
                </h1>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Hot takes. Real tea. Zero boring. ☕</p>
              </div>
              <button onClick={handleRefresh} disabled={refreshing || loading} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all shrink-0" style={{ background: "rgba(229,25,42,0.08)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.25)" }}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Loading..." : "Fresh"}
              </button>
            </div>
            {Object.keys(prefs.categoryScores).length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(255,255,255,0.4)" }}>
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: "#C9A84C" }} />
                <span>Feed personalised from your reading habits</span>
              </div>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="sticky top-[60px] z-30 overflow-x-auto" style={{ background: "rgba(8,8,8,0.95)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
          <div className="flex gap-1 px-4 py-2 min-w-max sm:px-6">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all" ? articles.length : articles.filter((a) => a.category === cat.id).length;
              const active = activeCategory === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap" style={{ background: active ? cat.color : "rgba(255,255,255,0.04)", color: active ? "#fff" : "rgba(255,255,255,0.45)", border: active ? "none" : "1px solid rgba(255,255,255,0.07)", boxShadow: active ? `0 0 16px ${cat.color}40` : "none" }}>
                  {cat.label}
                  {count > 0 && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)", color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bookmarks */}
        {bookmarkedArticles.length > 0 && (
          <div className="px-4 py-3 sm:px-6 border-b" style={{ borderColor: "rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
            <div className="mx-auto max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#C9A84C" }}><BookmarkPlus className="inline h-3 w-3 mr-1" />Saved</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {bookmarkedArticles.map((a) => (
                  <span key={a.id} className="rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap" style={{ background: "rgba(201,168,76,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(201,168,76,0.15)" }}>
                    {a.emoji} {a.headline.length > 35 ? a.headline.slice(0, 35) + "…" : a.headline}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Share toast */}
        {shared && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "#E5192A", color: "#fff", boxShadow: "0 8px 24px rgba(229,25,42,0.4)" }}>
            Copied to clipboard ✓
          </div>
        )}

        {/* Articles */}
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-4">
          {loading && (
            <>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              <p className="text-center text-xs py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Sparkles className="inline h-3 w-3 mr-1" /> Loading today's freshest entertainment news...
              </p>
            </>
          )}

          {!loading && sorted.map((article) => (
            <ArticleCard key={article.id} article={article} prefs={prefs} onLike={handleLike} onBookmark={handleBookmark} onView={handleView} onShare={handleShare} />
          ))}

          {!loading && sorted.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/30 text-sm">No articles in this category right now.</p>
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <div className="text-center pt-4 pb-8">
              <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all" style={{ background: "rgba(229,25,42,0.08)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.2)" }}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Getting fresh tea..." : "Load new stories ☕"}
              </button>
              <p className="mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Feed learns your taste over time</p>
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
