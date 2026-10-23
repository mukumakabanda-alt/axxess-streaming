import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Gamepad2, MapPin } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/lib/siteConfig";
import consoleImage from "@/assets/ps4-detail.webp.asset.json";

export const Route = createFileRoute("/console-rentals")({
  head: () => ({
    meta: [
      { title: "PS4 Console Rentals in Kitwe — Axxess" },
      { name: "description", content: "Rent a PS4 in Kitwe from K80 for 24 hours. Includes a controller, FIFA 17, Tomb Raider and free Netflix + Prime Video during your rental. Netflix K90/mo, Prime Video K60/mo, Both K140/mo." },
      { property: "og:title", content: "PS4 Console Rentals in Kitwe — Axxess" },
      { property: "og:description", content: "Game night. Movie night. One rental. PS4 rentals from K80, with Netflix + Prime Video included. Kitwe only. Netflix K90/mo, Prime Video K60/mo, Both K140/mo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://axxess-streaming.lovable.app/console-rentals" },
    ],
    links: [{ rel: "canonical", href: "https://axxess-streaming.lovable.app/console-rentals" }],
  }),
  component: ConsoleRentalsPage,
});

function ConsoleRentalsPage() {
  const cfg = useSiteConfig();
  const tiers = [
    { duration: "24 hrs", label: "24 hours", price: 80 },
    { duration: "3 days", label: "3 days", price: 250 },
    { duration: "7 days", label: "7 days", price: 400 },
  ];
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft /> Back to streaming</Link>
        </Button>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><MapPin className="size-3.5" /> Kitwe only</div>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">PS4 rentals</h1>
        <p className="mt-4 text-lg text-muted-foreground">Game night. Movie night. One rental.</p>
        <img src={consoleImage.url} alt="Black PlayStation 4 console and controller from the Axxess rental poster" width={680} height={584} className="mt-8 aspect-[680/584] w-full max-w-sm rounded-lg object-cover" />

        <div className="mt-10 border-b border-border pb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Gamepad2 className="size-5 text-primary" /> Your rental includes</h2>
          <p className="mt-4 leading-7 text-muted-foreground">PS4 Standard, one controller and two games: FIFA 17 + Tomb Raider.</p>
          <p className="mt-3 font-medium text-foreground">Netflix + Prime Video, free for the whole rental.</p>
        </div>

        <div className="py-8">
          <h2 className="text-xl font-semibold">Choose your duration</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Riverside · Parklands · Nkana East &amp; nearby areas.</p>
          <div className="mt-6 space-y-3">
            {tiers.map((tier) => (
              <Button asChild key={tier.duration} variant="outline" className="h-16 w-full justify-between rounded-lg border-border bg-card px-5 hover:border-primary/50">
                <a href={`https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(`Hi Axxess! I want to rent the PS4 for ${tier.duration}. My area is ___ and I need it from ___.`)}`} target="_blank" rel="noopener noreferrer" aria-label={`Book PS4 for ${tier.label}, K${tier.price}, on WhatsApp`}>
                  <span className="flex items-center gap-3">{tier.label}{tier.duration === "7 days" && <span className="text-[10px] font-semibold uppercase text-primary">Best value</span>}</span>
                  <span className="flex items-center gap-4"><span className="text-xl font-bold">K{tier.price}</span><ArrowRight className="text-primary" /></span>
                </a>
              </Button>
            ))}
          </div>
        </div>
        <Button asChild variant="link" className="h-auto whitespace-normal px-0 text-left text-sm text-muted-foreground">
          <Link to="/" hash="plans">Not in Kitwe? Streaming works anywhere in Zambia <ArrowRight /></Link>
        </Button>
      </section>
    </SiteShell>
  );
}