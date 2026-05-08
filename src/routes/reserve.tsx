import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reserve } from "@/components/site/Reserve";
import { Clock, MessageCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/reserve")({
  head: () => ({
    meta: [
      { title: "Reserve Your Spot — Axxess Streaming" },
      { name: "description", content: "Save your slot on a premium streaming package. We hold your spot and contact you on WhatsApp the moment one opens up." },
      { property: "og:title", content: "Reserve Your Spot — Axxess Streaming" },
      { property: "og:description", content: "Hold your space on Netflix, Spotify, or our premium bundles." },
    ],
  }),
  component: ReservePage,
});

function ReservePage() {
  return (
    <SiteShell>
      <section className="px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" /> Hold Your Space
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">Reserve Your Spot</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Not ready yet? Or your favourite package is full? We'll hold your spot and reach out the
            moment it opens — no payment needed today.
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              { Icon: Sparkles, t: "Free to reserve", d: "No commitment, no charge today" },
              { Icon: Clock, t: "Held for 1 month", d: "We keep your slot for a full 30 days" },
              { Icon: MessageCircle, t: "WhatsApp reply", d: "We reach out as soon as it's available" },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border gradient-card p-4 text-left">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Reserve />
    </SiteShell>
  );
}
