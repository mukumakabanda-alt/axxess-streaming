import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";
import heroGlow from "@/assets/hero-glow.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroGlow}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-60"
          width={1536}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>
      <div className="absolute inset-0 -z-10 gradient-radial-red" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Trusted by streamers across Zambia
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Premium<br />
            <span className="text-gradient-red">Entertainment</span><br />
            for Less
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Affordable Netflix & Spotify access for Zambia. Pay in Kwacha,
            get your access details in minutes — straight to your WhatsApp.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a
              href="#plans"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow-red transition-smooth hover:scale-[1.02] hover:bg-primary/90"
            >
              Order Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#plans"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-6 py-3.5 text-sm font-semibold text-foreground transition-smooth hover:bg-card"
            >
              View Plans
            </a>
            <a
              href={waLink(WHATSAPP_PRIMARY, "Hi Axxess Streaming! I'd like to know more.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-success/40 bg-success/10 px-6 py-3.5 text-sm font-semibold text-success transition-smooth hover:bg-success/20"
              style={{ color: "var(--color-spotify)" }}
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Fast · Affordable · Reliable
          </p>
        </div>
      </div>
    </section>
  );
}
