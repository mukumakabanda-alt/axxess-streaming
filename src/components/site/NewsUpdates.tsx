import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

type Update = { id: string; title: string; body: string; created_at: string };

export function NewsUpdates() {
  const [items, setItems] = useState<Update[]>([]);

  useEffect(() => {
    supabase.from("updates").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(4)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Latest updates</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((u) => (
            <article key={u.id} className="rounded-2xl border border-border gradient-card p-5">
              <h3 className="font-display text-lg font-bold">{u.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
              <time className="mt-3 block text-xs text-muted-foreground/60">
                {new Date(u.created_at).toLocaleDateString()}
              </time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
