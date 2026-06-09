import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero3D } from "@/components/site/Hero3D";
import { Pricing } from "@/components/site/Pricing";
import { HowItWorks } from "@/components/site/HowItWorks";
import { PackageQuiz } from "@/components/site/PackageQuiz";
import { Testimonials } from "@/components/site/Testimonials";
import { RenewalBanner } from "@/components/site/RenewalBanner";
import { IntroVideo } from "@/components/site/IntroVideo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Axxess Entertainment — Netflix & Prime Video in Zambia" },
      { name: "description", content: "Zambia's premium streaming platform. Netflix K70/mo, Prime Video K60/mo, All Access K140/mo. No card needed. Activated via WhatsApp in 15 minutes." },
      { property: "og:title", content: "Axxess Entertainment — Netflix & Prime Video in Zambia" },
      { property: "og:description", content: "Netflix K70/mo. Prime Video K60/mo. All Access K140/mo. No card. WhatsApp activation in 15 minutes. Zambia's #1 streaming deal." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <RenewalBanner />
      <Hero3D />
      <IntroVideo />
      <Pricing />
      <PackageQuiz />
      <HowItWorks />
      <Testimonials />
    </SiteShell>
  );
  }
