import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reserve } from "@/components/site/Reserve";

export const Route = createFileRoute("/reserve")({
  head: () => ({
    meta: [
      { title: "Reserve Your Spot — Axxess Streaming" },
      { name: "description", content: "Save your slot on a premium streaming package. We hold your spot and contact you on WhatsApp the moment one opens up." },
      { property: "og:url", content: "https://axxess-streaming.lovable.app/reserve" },
    ],
    links: [{ rel: "canonical", href: "https://axxess-streaming.lovable.app/reserve" }],
  }),
  component: () => (
    <SiteShell>
      <Reserve />
    </SiteShell>
  ),
});
