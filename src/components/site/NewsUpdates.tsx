import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Update = { id: string; title: string; body: string; created_at: string };

export function NewsUpdates() {
  const [items, setItems] = useState<Update[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  useEffect(() => {
    supabase
      .from("updates")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (items.length === 0) return null;

  return (
    <section className="relative px-4 py-20 sm:px-6">
      <div className="absolute inset-x-0 top-0 -z-10 h-40 gradient-radial-red opacity-60" />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Newsroom</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Fresh from Axxess</h2>
            </div>
          </div>
          <Link to="/news" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
        </div>

        <Carousel
          setApi={setApi}
          plugins={[autoplay.current]}
          opts={{ loop: true, align: "start" }}
          className="mt-8"
        >
          <CarouselContent>
            {items.map((u, idx) => (
              <CarouselItem key={u.id} className="sm:basis-1/2 lg:basis-1/3">
                <article className="group relative h-full overflow-hidden rounded-3xl border border-border gradient-card p-6 transition-smooth hover:-translate-y-1 hover:border-primary/50">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl transition-smooth group-hover:bg-primary/30" />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    #{String(idx + 1).padStart(2, "0")} · New
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold leading-tight">{u.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{u.body}</p>
                  <time className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </time>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-5 flex items-center justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-8 bg-primary shadow-glow-red" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
