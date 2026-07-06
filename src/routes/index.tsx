import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero3D } from "@/components/site/Hero3D";
import { RenewalBanner } from "@/components/site/RenewalBanner";

const Pricing      = lazy(() => import("@/components/site/Pricing").then(m => ({ default: m.Pricing })));
const PackageQuiz  = lazy(() => import("@/components/site/PackageQuiz").then(m => ({ default: m.PackageQuiz })));
const HowItWorks   = lazy(() => import("@/components/site/HowItWorks").then(m => ({ default: m.HowItWorks })));
const Testimonials = lazy(() => import("@/components/site/Testimonials").then(m => ({ default: m.Testimonials })));

// React.lazy only defers *bundle size* — the import() actually fires the
// instant the element is rendered, Suspense or not. Wrapping each section
// in this means the import() itself doesn't happen until it's ~600px from
// the viewport, so none of these four chunks compete with the hero's own
// `import("three")` at page load anymore.
function DeferredSection({ minHeight, children }: { minHeight: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={shouldRender ? undefined : { minHeight, width: "100%" }}>
      {shouldRender && (
        <Suspense fallback={<div className="animate-pulse" style={{ minHeight, width: "100%" }} aria-hidden />}>
          {children}
        </Suspense>
      )}
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Axxess Entertainment — Netflix & Prime in Zambia" },
      { name: "description", content: "Zambia's premium streaming platform. Netflix K70/mo, Prime Video K60/mo, All Access K140/mo. No card needed. Activated via WhatsApp in 15 minutes." },
      { property: "og:title", content: "Axxess Entertainment — Netflix & Prime in Zambia" },
      { property: "og:description", content: "Netflix K70/mo. Prime Video K60/mo. All Access K140/mo. No card. WhatsApp activation in 15 minutes. Zambia's #1 streaming deal." },
      { property: "og:url", content: "https://axxess-streaming.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://axxess-streaming.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <RenewalBanner />
      <Hero3D />
      <DeferredSection minHeight={640}><Pricing /></DeferredSection>
      <DeferredSection minHeight={480}><PackageQuiz /></DeferredSection>
      <DeferredSection minHeight={480}><HowItWorks /></DeferredSection>
      <DeferredSection minHeight={420}><Testimonials /></DeferredSection>
    </SiteShell>
  );
                                                                            }
