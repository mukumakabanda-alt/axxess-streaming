import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

export function IntroVideo() {
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
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          How Axxess Streaming Works
        </h2>
        <p className="mt-3 text-muted-foreground">
          Watch this short video to see how easy it is to get started.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
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
      </div>
    </section>
  );
}
