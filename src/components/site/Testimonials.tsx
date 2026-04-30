import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Quote, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Testimonial = {
  id: string;
  customer_name: string;
  message: string;
  screenshot_url: string | null;
  rating: number | null;
};

type PublicMessage = { id: string; name: string; message: string; screenshot_url: string | null };

type Card =
  | { kind: "t"; id: string; name: string; message: string; screenshot_url: string | null; rating: number | null }
  | { kind: "m"; id: string; name: string; message: string; screenshot_url: string | null };

const schema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  message: z.string().trim().min(5, "Message too short").max(500),
});

export function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const load = async () => {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("testimonials").select("*").eq("is_approved", true).order("sort_order"),
      supabase
        .from("public_messages")
        .select("id,name,message,screenshot_url")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setItems(t ?? []);
    setMessages((m ?? []) as PublicMessage[]);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const cards: Card[] = [
    ...items.map<Card>((t) => ({
      kind: "t", id: t.id, name: t.customer_name, message: t.message,
      screenshot_url: t.screenshot_url, rating: t.rating,
    })),
    ...messages.map<Card>((m) => ({
      kind: "m", id: m.id, name: m.name, message: m.message, screenshot_url: m.screenshot_url,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = schema.safeParse({ name: fd.get("name"), message: fd.get("message") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);

    let screenshot_url: string | null = null;
    const file = fd.get("screenshot") as File | null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitting(false);
        toast.error("Screenshot must be under 5MB");
        return;
      }
      const ext = file.name.split(".").pop() || "png";
      const path = `public-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("testimonial-screenshots")
        .upload(path, file, { contentType: file.type || "image/png" });
      if (upErr) {
        setSubmitting(false);
        toast.error("Could not upload screenshot: " + upErr.message);
        return;
      }
      screenshot_url = supabase.storage.from("testimonial-screenshots").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("public_messages").insert({
      ...parsed.data,
      screenshot_url,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not send message: " + error.message);
      return;
    }
    toast.success("Thanks! Your message is now live.");
    form.reset();
    load();
  };

  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Real Feedback</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Satisfied customers</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Real messages from happy customers across Zambia.
          </p>
        </div>

        {cards.length > 0 && (
          <Carousel
            setApi={setApi}
            plugins={[autoplay.current]}
            opts={{ loop: true, align: "start" }}
            className="mt-12"
          >
            <CarouselContent>
              {cards.map((c) => (
                <CarouselItem key={`${c.kind}-${c.id}`} className="sm:basis-1/2 lg:basis-1/3">
                  <div className="neon-red-glow h-full rounded-3xl border-2 gradient-card p-6">
                    {c.screenshot_url ? (
                      <img
                        src={c.screenshot_url}
                        alt={`Message from ${c.name}`}
                        loading="lazy"
                        className="mb-4 w-full rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <Quote className="mb-3 h-6 w-6 text-primary/60" />
                    )}
                    <p className="text-sm leading-relaxed text-foreground/90">"{c.message}"</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">— {c.name}</span>
                      {c.kind === "t" && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: c.rating ?? 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-2">
              {cards.map((_, i) => (
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
        )}

        {/* Submit your own */}
        <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-border gradient-card p-6 sm:p-8">
          <h3 className="font-display text-xl font-bold">Leave a message</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your experience. Optionally attach a screenshot.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="msg-name">Your name</Label>
              <Input id="msg-name" name="name" required maxLength={80} />
            </div>
            <div>
              <Label htmlFor="msg-message">Message</Label>
              <Textarea id="msg-message" name="message" required rows={3} maxLength={500} />
            </div>
            <div>
              <Label htmlFor="msg-screenshot">Screenshot (optional, max 5MB)</Label>
              <Input id="msg-screenshot" name="screenshot" type="file" accept="image/*" />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Send Message</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
