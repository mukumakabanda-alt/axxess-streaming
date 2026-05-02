import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero } from "@/components/site/Hero";
import { Pricing } from "@/components/site/Pricing";
import { PackageQuiz } from "@/components/site/PackageQuiz";
import { Testimonials } from "@/components/site/Testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Axxess Streaming — Premium Entertainment for Better Prices | Zambia" },
      { name: "description", content: "Welcome to Axxess Streaming. Affordable Netflix, Spotify, and premium streaming bundles in Zambia. Pay in Kwacha, get access in minutes." },
      { property: "og:title", content: "Axxess Streaming — Premium Entertainment" },
      { property: "og:description", content: "Affordable Netflix, Spotify, and premium streaming bundles in Zambia." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <Pricing />
      <PackageQuiz />
      <Testimonials />
    </SiteShell>
  );
}
