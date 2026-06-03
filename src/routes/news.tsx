import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Axxess News — AI-powered entertainment updates" },
      { name: "description", content: "Stay informed with Axxess News — AI-curated entertainment updates, drops, and announcements." },
      { property: "og:title", content: "Axxess News — Powered by AI" },
      { property: "og:description", content: "AI-curated entertainment news from Axxess Streaming." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <SiteShell>
      <section className="min-h-screen bg-black px-4 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              <span className="text-white">Axxess</span>{" "}
              <span style={{ color: "#ff1744", textShadow: "0 0 24px rgba(255,23,68,0.55)" }}>News</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-400 sm:text-base">
              Powered by AI — stay informed
            </p>
          </header>

          <div className="mt-8 overflow-hidden rounded-lg">
            <iframe
              src="https://axxess-news-engine.manus.space/widget"
              title="Axxess News Engine"
              loading="lazy"
              style={{ width: "100%", height: "800px", border: "none", borderRadius: "8px" }}
            />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
