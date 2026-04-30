import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
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
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Latest updates</h2>
        </div>

        <Carousel
          setApi={setApi}
          plugins={[autoplay.current]}
          opts={{ loop: true, align: "start" }}
          className="mt-6"
        >
          <CarouselContent>
            {items.map((u) => (
              <CarouselItem key={u.id} className="sm:basis-1/2">
                <article className="neon-red-glow h-full rounded-2xl border-2 gradient-card p-5">
                  <h3 className="font-display text-lg font-bold">{u.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
                  <time className="mt-3 block text-xs text-muted-foreground/60">
                    {new Date(u.created_at).toLocaleDateString()}
                  </time>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-4 flex items-center justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
