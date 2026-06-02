import { useEffect, useState } from "react";
import { ArrowRight, Play, Zap, MessageCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { firstName, getRememberedName } from "@/lib/customer";
import heroGlow from "@/assets/hero-glow.jpg";

export function Hero() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    setName(firstName(getRememberedName()));
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .then(({ count }) => setActiveCount(count ?? 0));
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "intro_video_url")
      .maybeSingle()
      .then(({ data }) => setVideoUrl(data?.value ?? ""));
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroGlow} alt="" aria-hidden className="h-full w-full object-cover opacity-40" width={1536} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>
      <div className="absolute inset-0 -z-10 gradient-radial-red" />

      <div className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pb-16 sm:pt-20">
        {/* Live subscriber badge */}
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {activeCount ?? "—"} active subscribers
        </div>

        <h1 className="mt-4 font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
          THE <span className="text-gradient-red">ENTERTAINMENT</span> YOU DESERVE.
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Netflix, Spotify and more — delivered straight to your WhatsApp in minutes. No contract, no stress, just Zambia's best streaming deal.
        </p>

        {/* Trust bar */}
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-2 text-[11px] sm:text-xs">
          {[
            { Icon: Zap, t: "Activated in 15 min" },
            { Icon: MessageCircle, t: "WhatsApp support daily" },
            { Icon: ShieldCheck, t: "100% satisfaction" },
          ].map(({ Icon, t }) => (
            <div key={t} className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-card/60 px-2 py-1.5 font-semibold text-foreground/85 backdrop-blur">
              <Icon className="h-3 w-3 text-primary" /> <span className="leading-tight">{t}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <a href="/trial" className="btn-primary-cta text-base px-9 py-4">
            Start My Free 2-Day Trial <ArrowRight className="h-4 w-4" />
          </a>
          {name && <p className="text-xs text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{name}</span> 👋</p>}
        </div>

        <div className="relative mx-auto mt-9 max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          {videoUrl ? (
            <video src={videoUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
          ) : (
            <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-card to-background">
              <div className="absolute inset-0 gradient-radial-red opacity-50" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow-red animate-pulse-glow">
                <Play className="h-8 w-8 text-primary-foreground" fill="currentColor" />
              </div>
              <p className="absolute bottom-6 text-xs text-muted-foreground">Intro video coming soon</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
