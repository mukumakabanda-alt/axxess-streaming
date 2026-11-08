import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import godOfWar from "@/assets/game-god-of-war.webp.asset.json";
import fc27 from "@/assets/game-fc27.webp.asset.json";
import needForSpeed from "@/assets/game-need-for-speed-heat.webp.asset.json";
import gta from "@/assets/game-gta-v.webp.asset.json";
import modernWarfare from "@/assets/game-modern-warfare-3.webp.asset.json";

const games = [
  { title: "God of War", image: godOfWar.url },
  { title: "FC 27", image: fc27.url },
  { title: "Need for Speed Heat", image: needForSpeed.url },
  { title: "GTA 5", image: gta.url },
  { title: "Call of Duty: Modern Warfare 3", image: modernWarfare.url },
];

export function RentalGames() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoplay] = useState(() => Autoplay({ delay: 5500, playOnInit: false, stopOnInteraction: true, stopOnMouseEnter: true }));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);

  useEffect(() => {
    const element = ref.current;
    if (!api || !element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      setReducedMotion(media.matches);
      if (visible && !paused && !media.matches && !document.hidden) autoplay.play();
      else autoplay.stop();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.25 });
    observer.observe(element);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      autoplay.stop();
    };
  }, [api, autoplay, paused]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-xs min-w-0">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Games included</h2>
      <Carousel opts={{ loop: true }} plugins={[autoplay]} setApi={setApi} aria-label="PS4 rental games" onPointerDown={() => setPaused(true)}>
        <CarouselContent>
          {games.map((game, index) => (
            <CarouselItem key={game.title} aria-label={`${index + 1} of ${games.length}: ${game.title}`}>
              <img src={game.image} alt={`${game.title} — included with your PS4 rental`} width={768} height={1366} loading="lazy" decoding="async" className="h-[min(480px,calc(100svh-260px))] min-h-40 w-full rounded-lg bg-card object-contain" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-4 flex min-h-14 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tabular-nums text-muted-foreground">{String(current + 1).padStart(2, "0")} / 05</p>
          <p className="min-h-10 text-sm font-medium leading-5">{games[current]?.title}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous game" title="Previous game" onClick={() => { setPaused(true); api?.scrollPrev(); }}><ArrowLeft /></Button>
          {!reducedMotion && <Button variant="ghost" size="icon" aria-label={paused ? "Play game slideshow" : "Pause game slideshow"} title={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused(value => !value)}>{paused ? <Play /> : <Pause />}</Button>}
          <Button variant="ghost" size="icon" aria-label="Next game" title="Next game" onClick={() => { setPaused(true); api?.scrollNext(); }}><ArrowRight /></Button>
        </div>
      </div>
    </div>
  );
}