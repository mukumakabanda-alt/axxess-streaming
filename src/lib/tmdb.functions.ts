import { createServerFn } from "@tanstack/react-start";

export type TrendingShow = { title: string; poster: string; rating?: string };

export const getTrendingShows = createServerFn({ method: "GET" }).handler(async (): Promise<TrendingShow[]> => {
  const key = process.env["TMDB_API_KEY"];
  if (!key) return [];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${key}&language=en-US`);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Array<{ name?: string; original_name?: string; poster_path?: string; vote_average?: number }> };
    const out: TrendingShow[] = [];
    for (const s of data.results ?? []) {
      if (out.length >= 12) break;
      if (!s.poster_path) continue;
      out.push({
        title: s.name ?? s.original_name ?? "Trending now",
        poster: `https://image.tmdb.org/t/p/w185${s.poster_path}`,
        rating: s.vote_average ? s.vote_average.toFixed(1) : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
});
