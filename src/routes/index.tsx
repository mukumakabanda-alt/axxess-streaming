import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero3D } from "@/components/site/Hero3D";
import { RenewalBanner } from "@/components/site/RenewalBanner";

// Below-the-fold sections are now code-split instead of eagerly bundled
// into the homepage chunk. Previously all four loaded (and parsed/ran)
// before first paint even though none of them are visible until the
// user scrolls — this lets the hero paint first and loads the rest in
// parallel without blocking it.
const Pricing      = lazy(() => import("@/components/site/Pricing").then(m => ({ default: m.Pricing })));
const PackageQuiz  = lazy(() => import("@/components/site/PackageQuiz").then(m => ({ default: m.PackageQuiz })));
const HowItWorks   = lazy(() => import("@/components/site/HowItWorks").then(m => ({ default: m.HowItWorks })));
const Testimonials = lazy(() => import("@/components/site/Testimonials").then(m => ({ default: m.Testimonials })));

// Minimal, layout-shift-safe fallback — a blank block roughly the height
// of the section it's replacing, so content doesn't jump around as each
// chunk finishes loading. Uses Tailwind's built-in opacity-based pulse
// (compositor-only), not a box-shadow animation.
function SectionFallback({ minHeight }: { minHeight: number }) {
  return <div className="animate-pulse" style={{ minHeight, width: "100%" }} aria-hidden />;
}

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
      <Suspense fallback={<SectionFallback minHeight={640} />}>
        <Pricing />
      </Suspense>
      <Suspense fallback={<SectionFallback minHeight={480} />}>
        <PackageQuiz />
      </Suspense>
      <Suspense fallback={<SectionFallback minHeight={480} />}>
        <HowItWorks />
      </Suspense>
      <Suspense fallback={<SectionFallback minHeight={420} />}>
        <Testimonials />
      </Suspense>
    </SiteShell>
  );
}
