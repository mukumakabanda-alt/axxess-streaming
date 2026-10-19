import { createServerFn } from "@tanstack/react-start";

export type TrendingShow = { title: string; poster: string; rating?: string; platform: "netflix" | "prime" };

type TmdbShow = { name?: string; original_name?: string; poster_path?: string; vote_average?: number };

// Popular shows actually on each service (TMDB watch providers: Netflix 8, Prime Video 9/119).
export const getTrendingShows = createServerFn({ method: "GET" }).handler(async (): Promise<TrendingShow[]> => {
  const key = process.env["TMDB_API_KEY"];
  if (!key) return [];
  const load = async (providers: string, platform: TrendingShow["platform"]) => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${key}&language=en-US&sort_by=popularity.desc&watch_region=US&with_watch_providers=${providers}&vote_count.gte=200`,
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: TmdbShow[] };
      return (data.results ?? [])
        .filter((s) => s.poster_path)
        .slice(0, 8)
        .map((s) => ({
          title: s.name ?? s.original_name ?? "Trending now",
          poster: `https://image.tmdb.org/t/p/w185${s.poster_path}`,
          rating: s.vote_average ? s.vote_average.toFixed(1) : undefined,
          platform,
        }));
    } catch {
      return [];
    }
  };
  const [n, p] = await Promise.all([load("8", "netflix"), load("9|119", "prime")]);
  const out: TrendingShow[] = [];
  for (let i = 0; i < Math.max(n.length, p.length); i++) {
    if (n[i]) out.push(n[i]);
    if (p[i]) out.push(p[i]);
  }
  return out;
});
