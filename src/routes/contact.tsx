import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Phone, MessageCircle, Users, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Axxess Streaming" },
      { name: "description", content: "Get fast support from the Axxess Streaming team. Call us, chat on WhatsApp, or join the customer community." },
      { property: "og:title", content: "Contact & Support — Axxess Streaming" },
      { property: "og:description", content: "We're here to help — chat on WhatsApp anytime." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [groupLink, setGroupLink] = useState("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_group_link")
      .maybeSingle()
      .then(({ data }) => setGroupLink(data?.value ?? ""));
  }, []);

  const formatPhone = (p: string) =>
    `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8)}`;

  return (
    <SiteShell>
      <section className="px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold sm:text-5xl">Contact &amp; Support</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Talk to a real human. We respond fastest on WhatsApp.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-2xl gap-4">
          {/* Primary contact */}
          <div className="rounded-3xl border border-primary/30 gradient-card p-6 shadow-glow-red sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Talk to us</p>
                <a href={`tel:+${WHATSAPP_PRIMARY}`} className="font-display text-xl font-bold">
                  {formatPhone(WHATSAPP_PRIMARY)}
                </a>
              </div>
            </div>
            <a
              href={waLink(WHATSAPP_PRIMARY, "Hi Axxess Streaming!")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-black"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>

          {/* Community */}
          <div className="rounded-3xl border border-border gradient-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "color-mix(in oklab, #25D366 18%, transparent)", color: "#25D366" }}
              >
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold">Join the community</p>
                <p className="text-xs text-muted-foreground">Updates, deals &amp; quick support</p>
              </div>
            </div>
            <a
              href={groupLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-cta mt-5 w-full"
            >
              <Users className="h-4 w-4" /> Join WhatsApp Group
            </a>
          </div>

          {/* Support hours */}
          <div className="rounded-3xl border border-border gradient-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <HelpCircle className="h-5 w-5" />
              </span>
              <p className="font-display text-base font-bold">Support hours</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Mon–Sun · 8:00 – 22:00 (CAT). Outside hours? Drop a WhatsApp — we reply first thing.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
