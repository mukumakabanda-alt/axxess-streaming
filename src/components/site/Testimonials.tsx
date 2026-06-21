import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Quote, Send, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { rememberCustomer } from "@/lib/customer";
import { recordRewardUnlocks } from "@/lib/rewards";
import { showRewardUnlock } from "./RewardUnlockToast";

type Testimonial = {
  id: string;
  customer_name: string;
  message: string;
  screenshot_url: string | null;
  rating: number | null;
};

type PublicMessage = {
  id: string;
  name: string;
  message: string;
  screenshot_url: string | null;
  rating: number | null;
};

type Card =
  | { kind: "t"; id: string; name: string; message: string; screenshot_url: string | null; rating: number | null }
  | { kind: "m"; id: string; name: string; message: string; screenshot_url: string | null; rating: number | null };

const schema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  phone: z.string().trim().min(6, "Add your WhatsApp number").max(20),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
});

const ACCENT_BARS = [
  "from-rose-500 via-fuchsia-500 to-amber-400",
  "from-emerald-400 via-cyan-400 to-blue-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-violet-500 via-pink-500 to-rose-400",
  "from-cyan-400 via-sky-500 to-indigo-500",
];

export function Testimonials() {
  const [items,      setItems]      = useState<Testimonial[]>([]);
  const [messages,   setMessages]   = useState<PublicMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [api,        setApi]        = useState<CarouselApi>();
  const [current,    setCurrent]    = useState(0);
  const [rating,     setRating]     = useState<number>(0);
  const autoplay = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const load = useCallback(async () => {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("testimonials").select("*").eq("is_approved", true).order("sort_order"),
      supabase
        .from("public_messages")
        .select("id,name,message,screenshot_url,rating")
        .eq("is_approved", true)
        .order("id", { ascending: false })
        .limit(12),
    ]);
    setItems(t ?? []);
    setMessages((m ?? []) as PublicMessage[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const allCards: Card[] = [
    ...items.map<Card>((t) => ({
      kind: "t", id: t.id, name: t.customer_name, message: t.message,
      screenshot_url: t.screenshot_url, rating: t.rating,
    })),
    ...messages.map<Card>((m) => ({
      kind: "m", id: m.id, name: m.name, message: m.message,
      screenshot_url: m.screenshot_url, rating: m.rating ?? null,
    })),
  ];

  const cards: Card[] = (() => {
    if (allCards.length <= 5) return allCards;
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const offset = dayIndex % allCards.length;
    const out: Card[] = [];
    for (let i = 0; i < 5; i++) out.push(allCards[(offset + i) % allCards.length]);
    return out;
  })();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nameVal    = String(fd.get("name")    || "").trim();
    const phoneVal   = String(fd.get("phone")   || "").trim();
    const messageVal = String(fd.get("message") || "").trim();

    const parsed = schema.safeParse({
      name: nameVal, phone: phoneVal,
      message: messageVal, rating: rating || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!messageVal && !rating) { toast.error("Add a short message or rate us with stars"); return; }

    setSubmitting(true);
    const finalMessage = messageVal || `Rated us ${rating} out of 5 ⭐`;

    const { error } = await supabase.from("public_messages").insert({
      name: parsed.data.name,
      message: finalMessage,
      screenshot_url: null,
      rating: rating || null,
      phone: parsed.data.phone,
    });

    if (error) { setSubmitting(false); toast.error("Could not send: " + error.message); return; }

    rememberCustomer(parsed.data.name, parsed.data.phone);

    try {
      const { data: prev } = await supabase
        .from("customer_points").select("points")
        .eq("customer_phone", parsed.data.phone).maybeSingle();
      const prevPoints = prev?.points ?? 0;
      const { data: newTotal } = await supabase.rpc("award_points", {
        _phone: parsed.data.phone, _name: parsed.data.name,
        _delta: 5, _reason: "Left a review",
      });
      const newPoints = (newTotal as number) ?? prevPoints + 5;
      const unlocks = await recordRewardUnlocks(parsed.data.phone, parsed.data.name, prevPoints, newPoints);
      unlocks.forEach((u) => showRewardUnlock(u.points, u.label));
      toast.success("Thanks! +5 points added to your rewards 🎉");
    } catch {
      toast.success("Thanks for the feedback!");
    }

    setSubmitting(false);
    setRating(0);
    form.reset();
    api?.scrollTo(0);
  };

  const ratedAll = [
    ...items.filter((t) => t.rating! > 0).map((t) => t.rating!),
    ...messages.filter((m) => m.rating! > 0).map((m) => m.rating!),
  ];
  const avgRating  = ratedAll.length ? ratedAll.reduce((a, b) => a + b, 0) / ratedAll.length : 0;
  const ratedCount = ratedAll.length;

  return (
    <section id="reviews" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">

        {/* ── Header ── */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Real People</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Loved by customers</h2>
          {avgRating > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-4 w-4 ${n <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                ))}
              </div>
              <span className="font-display text-sm font-bold">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({ratedCount} review{ratedCount === 1 ? "" : "s"})</span>
            </div>
          )}
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Leave a review &amp; earn <span className="font-semibold text-primary">+5 points</span>.
          </p>
        </div>

        {/* ── Carousel ── */}
        {cards.length > 0 && (
          <Carousel
            setApi={setApi}
            plugins={[autoplay.current]}
            opts={{ loop: true, align: "start" }}
            className="mt-10"
          >
            <CarouselContent>
              {cards.map((c, idx) => (
                <CarouselItem key={`${c.kind}-${c.id}`} className="basis-[72%] sm:basis-[40%] lg:basis-[28%]">
                  <article className="relative h-full overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-card to-background/60 shadow-card transition-smooth hover:-translate-y-0.5">
                    <div className={`h-1 w-full bg-gradient-to-r ${ACCENT_BARS[idx % ACCENT_BARS.length]}`} />
                    <div className="flex items-center gap-2.5 px-5 pt-4">
                      <div className={`relative flex h-9 w-9 items-center justify-center rounded-full p-[2px] bg-gradient-to-tr ${ACCENT_BARS[idx % ACCENT_BARS.length]}`}>
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-card text-[13px] font-bold uppercase">
                          {c.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Axxess Entertainment
                        </p>
                      </div>
                      {c.rating != null && c.rating > 0 && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: c.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                          ))}
                        </div>
                      )}
                    </div>

                    {c.screenshot_url ? (
                      <img
                        src={c.screenshot_url}
                        alt={`${c.name}'s review`}
                        loading="lazy"
                        className="mt-3 aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="mt-3 flex aspect-square items-center justify-center bg-gradient-to-br from-secondary/50 to-card p-6 text-center">
                        <Quote className="absolute h-12 w-12 text-primary/15" />
                        <p className="relative font-display text-lg leading-snug text-foreground/90">
                          "{c.message.length > 140 ? c.message.slice(0, 140) + "…" : c.message}"
                        </p>
                      </div>
                    )}

                    {c.screenshot_url && (
                      <p className="px-5 py-3 text-sm text-foreground/85">
                        <span className="font-semibold">{c.name}</span>{" "}
                        {c.message.length > 140 ? c.message.slice(0, 140) + "…" : c.message}
                      </p>
                    )}
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-2">
              {cards.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                />
              ))}
            </div>
          </Carousel>
        )}

        {/* ── POST-REVIEW CTA — peak buying intent moment ── */}
        <div className="mt-12 mb-10 rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(229,25,42,0.08) 0%, rgba(201,168,76,0.05) 100%)", border: "1px solid rgba(229,25,42,0.18)" }}>
          <div className="px-6 py-8 sm:px-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: "#E5192A" }}>
                Join them
              </p>
              <h3 className="font-display text-2xl font-black text-white leading-tight mb-2" style={{ letterSpacing: "-0.5px" }}>
                They're already watching.<br />
                <span style={{ background: "linear-gradient(90deg, #E5192A, #C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  What are you waiting for?
                </span>
              </h3>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Netflix K70 · Prime K60 · Both for K140 · Activated in 15 mins
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <a
                href="#plans"
                onClick={(e) => { e.preventDefault(); document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); }}
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-black text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95"
                style={{ background: "#E5192A", boxShadow: "0 0 32px -8px rgba(229,25,42,0.7)", minWidth: 180 }}
              >
                <Zap className="h-4 w-4" fill="currentColor" />
                Get Access Now
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/260770514809?text=${encodeURIComponent("Hi Axxess! 👋 I'd like to know more about your plans.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-sm font-semibold transition-all hover:border-white/30 hover:text-white"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
              >
                Ask a question first
              </a>
            </div>
          </div>
        </div>

        {/* ── Review form ── */}
        <div className="mx-auto max-w-md rounded-3xl border border-border gradient-card p-6 sm:p-8">
          <h3 className="font-display text-lg font-bold">Leave a quick review</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a message <span className="text-foreground/60">or</span> rate us — earn +5 points.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="rev-name" className="text-xs">Name</Label>
                <Input id="rev-name" name="name" required maxLength={80} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="rev-phone" className="text-xs">WhatsApp</Label>
                <Input id="rev-phone" name="phone" required maxLength={20} placeholder="+260 ..." />
              </div>
            </div>

            <div>
              <Label htmlFor="rev-message" className="text-xs">Message (optional)</Label>
              <Textarea id="rev-message" name="message" rows={2} maxLength={500} placeholder="Share your experience" />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Or rate us</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n === rating ? 0 : n)}
                    className="rounded-md p-1 transition-smooth hover:scale-110"
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star className={`h-5 w-5 transition-smooth ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Submit &amp; earn 5 pts</>
              )}
            </Button>
          </form>
        </div>

      </div>
    </section>
  );
                                                    }
