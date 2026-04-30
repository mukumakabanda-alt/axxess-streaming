import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Hero } from "@/components/site/Hero";
import { IntroVideo } from "@/components/site/IntroVideo";
import { Pricing } from "@/components/site/Pricing";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Testimonials } from "@/components/site/Testimonials";
import { WhatsAppCommunity } from "@/components/site/WhatsAppCommunity";
import { Trust } from "@/components/site/Trust";
import { FAQ } from "@/components/site/FAQ";
import { ContactCTA } from "@/components/site/ContactCTA";
import { NewsUpdates } from "@/components/site/NewsUpdates";
import { Referral } from "@/components/site/Referral";
import { Reserve } from "@/components/site/Reserve";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <IntroVideo />
        <Pricing />
        <HowItWorks />
        <Testimonials />
        <WhatsAppCommunity />
        <Trust />
        <NewsUpdates />
        <Reserve />
        <Referral />
        <FAQ />
        <ContactCTA />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}
