import { Phone, MessageCircle } from "lucide-react";
import { WHATSAPP_PRIMARY, WHATSAPP_SECONDARY, waLink } from "@/lib/whatsapp";

export function ContactCTA() {
  return (
    <section id="contact" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-glow-red sm:p-14">
        <div className="absolute inset-0 -z-10 gradient-radial-red opacity-40" />
        <h2 className="font-display text-3xl font-bold sm:text-5xl">
          Ready to start? <span className="text-gradient-red">Message us now.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Tap a number to call, or hit WhatsApp for the fastest response.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[WHATSAPP_PRIMARY, WHATSAPP_SECONDARY].map((p) => (
            <div key={p} className="rounded-2xl border border-border bg-background/40 p-5">
              <a href={`tel:+${p}`} className="flex items-center justify-center gap-2 text-base font-semibold">
                <Phone className="h-4 w-4 text-primary" />
                +{p.slice(0, 3)} {p.slice(3, 5)} {p.slice(5, 8)} {p.slice(8)}
              </a>
              <a
                href={waLink(p, "Hi Axxess Streaming!")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-black"
                style={{ backgroundColor: "var(--color-spotify)" }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
