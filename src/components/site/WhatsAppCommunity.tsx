import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users } from "lucide-react";

export function WhatsAppCommunity() {
  const [link, setLink] = useState<string>("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_group_link")
      .maybeSingle()
      .then(({ data }) => setLink(data?.value ?? ""));
  }, []);

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-elegant sm:p-12">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "color-mix(in oklab, #25D366 18%, transparent)" }}
        >
          <Users className="h-7 w-7" style={{ color: "#25D366" }} />
        </div>
        <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">
          Join Our WhatsApp Group
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Get updates, exclusive offers, and instant support from our team.
        </p>
        <a
          href={link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-black transition-smooth hover:opacity-90"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle className="h-4 w-4" />
          Join Group
        </a>
      </div>
    </section>
  );
        }
