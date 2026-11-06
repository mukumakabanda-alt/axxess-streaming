import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadSiteConfig, getSiteConfig } from "@/lib/siteConfig";

const FALLBACK_GROUP = "https://chat.whatsapp.com/LWhwyD6Bw9M0PRJdR1c9Tg";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "You're invited to Axxess Entertainment" },
      { name: "description", content: "A friend invited you to the Axxess WhatsApp community. Netflix Lite K40/15 days, Netflix Personal K90/mo, Prime Video K60/mo, Both K140/mo." },
      { property: "og:title", content: "You're invited to Axxess Entertainment" },
      { property: "og:description", content: "Join the Axxess WhatsApp community — Netflix from K40, Prime Video K60/mo. No card needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();

  useEffect(() => {
    const clean = code.trim().toUpperCase().slice(0, 20);
    try { localStorage.setItem("axx_ref_code", clean); } catch {}
    const visit = supabase.rpc("record_referral_visit", {
      _code: clean,
      _user_agent: navigator.userAgent,
      _referer: document.referrer || "",
    });
    Promise.allSettled([visit, loadSiteConfig()]).then(() => {
      window.location.replace(getSiteConfig().whatsappGroupLink || FALLBACK_GROUP);
    });
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="font-display text-xl font-bold">Taking you to the Axxess WhatsApp community…</p>
      <p className="text-sm text-muted-foreground">Invite code <span className="font-mono text-primary">{code.toUpperCase()}</span> is saved — mention it when you order.</p>
    </div>
  );
}
