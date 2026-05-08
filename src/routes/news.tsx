import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Loader2 } from "lucide-react";

type Update = { id: string; title: string; body: string; created_at: string };

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Updates — Axxess Streaming" },
      { name: "description", content: "The latest news, drops, and announcements from Axxess Streaming." },
      { property: "og:title", content: "News & Updates — Axxess Streaming" },
      { property: "og:description", content: "Latest announcements from Axxess Streaming." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const [items, setItems] = useState<Update[] | null>(null);

  useEffect(() => {
    supabase
      .from("updates")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Update[]));
  }, []);

  return (
    <SiteShell>
      <section className="px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Newspaper className="h-3.5 w-3.5" /> Latest
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl">News &amp; Updates</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Fresh announcements from the Axxess team — new drops, deals, and behind-the-scenes news.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {items === null ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No updates yet. Check back soon!
            </p>
          ) : (
            <ul className="grid gap-4">
              {items.map((u) => (
                <li
                  key={u.id}
                  className="group relative overflow-hidden rounded-3xl border border-border gradient-card p-6 transition-smooth hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-smooth group-hover:bg-primary/20" />
                  <time className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </time>
                  <h2 className="mt-2 font-display text-xl font-bold">{u.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{u.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
