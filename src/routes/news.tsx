import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";

type Update = { id: string; title: string; body: string; created_at: string };

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Updates — Axxess Streaming" },
      { name: "description", content: "The latest updates, drops, and announcements from Axxess Streaming." },
    ],
  }),
  component: NewsPage,
});

const FEATURED_IMG = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200";

const STARTERS: { tag: string; title: string; excerpt: string; date: string }[] = [
  { tag: "NEW", title: "Axxess Streaming is officially live in Zambia 🇿🇲", excerpt: "Premium Netflix and Spotify access — finally affordable, finally local.", date: "2025-05-01" },
  { tag: "DEAL", title: "All Access Bundle: Netflix + Spotify for just K100/mo", excerpt: "Get everything in one package. The best value deal we offer.", date: "2025-05-03" },
  { tag: "TIP", title: "How to pay with MTN Mobile Money in 3 steps", excerpt: "Never used mobile money for a subscription before? Here's exactly how it works.", date: "2025-05-04" },
];

const TAG_TONE: Record<string, string> = {
  NEW: "bg-emerald-500/15 text-emerald-300",
  DEAL: "bg-amber-500/15 text-amber-300",
  TIP: "bg-sky-500/15 text-sky-300",
  UPDATE: "bg-primary/15 text-primary",
};

function NewsPage() {
  const [items, setItems] = useState<Update[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Update[]));
  }, []);

  // Build combined posts: published DB updates first, then starters
  const combined = [
    ...items.map((u) => ({
      id: u.id, tag: "UPDATE", title: u.title, excerpt: u.body.slice(0, 130),
      date: new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }),
    })),
    ...STARTERS.map((s, i) => ({
      id: `s-${i}`, tag: s.tag, title: s.title, excerpt: s.excerpt,
      date: new Date(s.date).toLocaleDateString(undefined, { dateStyle: "medium" }),
    })),
  ];
  const featured = combined[0];
  const rest = combined.slice(1);

  return (
    <SiteShell>
      <section className="px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Newspaper className="h-3.5 w-3.5" /> Updates
          </p>
          <h1 className="relative mt-3 inline-block font-display text-3xl font-bold sm:text-5xl">
            News &amp; Updates
            <span className="absolute -bottom-2 left-0 h-0.5 w-full origin-left bg-primary" style={{ animation: "reveal-line 0.9s cubic-bezier(.16,1,.3,1) forwards" }} />
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {featured && (
          <Link to="/news" className="group relative block overflow-hidden rounded-3xl border border-border">
            <img src={FEATURED_IMG} alt="" className="aspect-[16/8] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TAG_TONE[featured.tag] ?? TAG_TONE.UPDATE}`}>{featured.tag}</span>
              <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-4xl">{featured.title}</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">{featured.excerpt}</p>
              <p className="mt-2 text-xs text-white/60">{featured.date}</p>
            </div>
          </Link>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {rest.map((p) => (
            <article key={p.id} className="group relative overflow-hidden rounded-3xl border border-border gradient-card p-6 transition-smooth hover:-translate-y-0.5 hover:border-primary/40">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TAG_TONE[p.tag] ?? TAG_TONE.UPDATE}`}>{p.tag}</span>
              <h3 className="mt-3 font-display text-lg font-bold leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{p.date}</p>
                <span className="text-xs font-bold text-primary group-hover:underline">Read more →</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
