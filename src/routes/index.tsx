import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const seenKey = `axx_ref_seen_${ref}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    try { localStorage.setItem("axx_ref_code", ref); } catch {}
    supabase.rpc("record_referral_visit", {
      _code: ref,
      _user_agent: navigator.userAgent,
      _referer: document.referrer || "",
    });
  }, []);

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
