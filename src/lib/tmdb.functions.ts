import { createServerFn } from "@tanstack/react-start";

export type TrendingShow = { title: string; poster: string; rating?: string; platform: "netflix" };

type TmdbShow = { name?: string; original_name?: string; poster_path?: string; vote_average?: number };

// Popular shows actually on Netflix (TMDB watch provider 8).
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
        .slice(0, 16)
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
  const out: TrendingShow[] = await load("8", "netflix");
  return out;
});
