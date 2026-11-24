import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/lib/siteConfig";
import video from "@/assets/console_activation.mp4.asset.json";
import poster from "@/assets/console_activation.jpg.asset.json";

export const Route = createFileRoute("/console-rentals_/activate")({
  head: () => ({
    meta: [
      { title: "How to Activate Your Rented PS4 — Axxess" },
      { name: "description", content: "Short video guide: how to switch on and activate your rented Axxess PS4 in Kitwe, step by step." },
      { property: "og:title", content: "How to Activate Your Rented PS4 — Axxess" },
      { property: "og:description", content: "Watch the quick guide to get your rented PS4 running in minutes." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://axxess-streaming.lovable.app/console-rentals/activate" },
    ],
    links: [{ rel: "canonical", href: "https://axxess-streaming.lovable.app/console-rentals/activate" }],
  }),
  component: ActivatePage,
});

const steps = [
  "Connect the PS4 to your TV and power, then switch it on.",
  "Follow the video exactly, step by step, before opening any game.",
  "Once it's activated, pick a game and play.",
];

function ActivatePage() {
  const cfg = useSiteConfig();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3 text-muted-foreground">
          <Link to="/console-rentals"><ArrowLeft /> Back to PS4 rentals</Link>
        </Button>
        <p className="text-xs font-semibold uppercase text-primary">Rental guide</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Activate your PS4</h1>
        <p className="mt-4 text-lg text-muted-foreground">Got your console? Watch this first. It takes under a minute.</p>
        <video src={video.url} poster={poster.url} controls playsInline preload="metadata" className="mt-8 aspect-video w-full rounded-lg bg-card object-contain" />
        <ol className="mt-10 space-y-4">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{i + 1}</span>
              <span className="pt-0.5 leading-7 text-muted-foreground">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 border-t border-border pt-8">
          <p className="text-muted-foreground">Stuck? We'll walk you through it.</p>
          <Button asChild className="mt-4">
            <a href={`https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent("Hi Axxess! I need help activating my rented PS4.")}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Get help on WhatsApp</a>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
