import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero3D } from "@/components/site/Hero3D";
import { MomentumStrip } from "@/components/site/MomentumStrip";
import { Pricing } from "@/components/site/Pricing";
import { HowItWorks } from "@/components/site/HowItWorks";
import { PackageQuiz } from "@/components/site/PackageQuiz";
import { Testimonials } from "@/components/site/Testimonials";
import { RenewalBanner } from "@/components/site/RenewalBanner";

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
      <RenewalBanner />
      <Hero3D />
      <MomentumStrip />
      <Pricing />
      <HowItWorks />
      <PackageQuiz />
      <Testimonials />
    </SiteShell>
  );
}
