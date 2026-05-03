import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroGlow from "@/assets/hero-glow.jpg";

export function Hero() {
  const [videoUrl, setVideoUrl] = useState<string>("");

  useEffect(() => {
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
        <img
          src={heroGlow}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-40"
          width={1536}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>
      <div className="absolute inset-0 -z-10 gradient-radial-red" />

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Trusted by streamers across Zambia
        </div>

        <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Welcome to <span className="text-gradient-red">Axxess Streaming</span>
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Premium entertainment for better prices.
        </p>

        <div className="mt-7 flex flex-col items-center gap-2">
          <a
            href="/trial"
            className="btn-primary-cta text-base px-9 py-4"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-muted-foreground">
            2-day free trial — pick any package below to begin.
          </p>
        </div>

        {/* Intro video */}
        <div className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-card to-background">
              <div className="absolute inset-0 gradient-radial-red opacity-50" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow-red animate-pulse-glow">
                <Play className="h-8 w-8 text-primary-foreground" fill="currentColor" />
              </div>
              <p className="absolute bottom-6 text-xs text-muted-foreground">
                Intro video coming soon
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Fast · Affordable · Reliable
        </p>
      </div>
    </section>
  );
}
