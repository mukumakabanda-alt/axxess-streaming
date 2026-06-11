import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { BottomNav } from "./BottomNav";
import { WhatsAppFab } from "./WhatsAppFab";
import { PageTransition } from "./PageTransition";
import { RewardUnlockToaster } from "./RewardUnlockToast";
import { WelcomeBackToast } from "./WelcomeBackToast";
import { NewsPopup } from "./NewsPopup";

const SESSION_KEY = "axx_session_id";
const VISIT_LOGGED_KEY = "axx_visit_logged_paths";

function getSessionId() {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const top = useRef<HTMLDivElement>(null);

  // Capture referral code on first load
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

  // Log a page visit at most once per route per session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const logged: string[] = JSON.parse(sessionStorage.getItem(VISIT_LOGGED_KEY) || "[]");
    if (logged.includes(pathname)) return;
    logged.push(pathname);
    sessionStorage.setItem(VISIT_LOGGED_KEY, JSON.stringify(logged));
    supabase.rpc("log_page_visit", {
      _path: pathname,
      _session: getSessionId(),
      _ua: navigator.userAgent,
      _referer: document.referrer || "",
    });
  }, [pathname]);

  // Reset scroll on route change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div ref={top} className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pb-28 pt-[60px]">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <RewardUnlockToaster />
      <WelcomeBackToast />
      <NewsPopup />
      <BottomNav />
    </div>
  );
}
