import { supabase } from "@/integrations/supabase/client";
import { rememberSubscriptionId, getRememberedPhone } from "@/lib/customer";

const ONESIGNAL_APP_ID = "03fb7168-1d9c-4fb9-8064-01a8c6333053";

declare global {
  interface Window {
    OneSignalDeferred?: ((onesignal: any) => void)[];
    OneSignal?: any;
  }
}

/* ─── Initialize ──────────────────────────────────────────────────────────── */
export function initOneSignal(): void {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId:              ONESIGNAL_APP_ID,
      notifyButton:       { enable: false },
      serviceWorkerPath:  "OneSignalSDK.sw.js",
      serviceWorkerParam: { scope: "/" },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type:       "push",
              autoPrompt: true,
              text: {
                actionMessage: "Get notified about new streaming deals, drops & Axxess news 🎬",
                acceptButton:  "Yes, notify me",
                cancelButton:  "Maybe later",
              },
              delay: {
                pageViews: 2,
                timeDelay: 8,
              },
            },
          ],
        },
      },
    });

    // Subscribe observer — fires the moment permission is granted (or
    // revoked) on this device. Stores the subscription ID locally so the
    // /renew page can link WhatsApp customers to push without them needing
    // to go through checkout, and mirrors the opt-in state to Supabase
    // (best-effort) so the admin Subscriptions tab can show who's actually
    // reachable by push — that's what lets Stan avoid double-sending a
    // renewal reminder over WhatsApp to someone who already got it via push.
    OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
      const prev = event.previous?.id;
      const curr = event.current?.id;
      const justSubscribed = (!prev || prev === "") && curr && curr !== "";

      if (justSubscribed) {
        // Persist to localStorage — used by /renew to link WA customers
        rememberSubscriptionId(curr);

        OneSignal.InAppMessages.addTrigger(
          "ai_implementation_campaign_email_journey",
          "true",
        );
        sendWelcomePush(curr);
      }

      // Keep the admin-visible opt-in record in sync for whichever phone
      // this device is currently identified as (if any yet).
      const knownPhone = getRememberedPhone();
      if (knownPhone) {
        recordPushOptIn(knownPhone, !!curr && curr !== "", curr || null);
      }
    });
  });
}

/* ─── Welcome push ───────────────────────────────────────────────────────── */
async function sendWelcomePush(subscriptionId: string): Promise<void> {
  try {
    await supabase.functions.invoke("send-welcome-push", {
      body: { subscriptionId },
    });
  } catch (err) {
    console.error("Welcome push failed:", err);
  }
}

/* ─── Record push opt-in for the admin dashboard ──────────────────────────
   Best-effort only, never throws — a failure here should never block the
   actual push flow. Lets SubscriptionsTab show a tick for "reachable by
   push" per customer, and lets send-reminders' notification_log answer
   "already sent a renewal reminder" so Stan never has to guess before
   following up manually on WhatsApp. */
async function recordPushOptIn(phoneDigits: string, optedIn: boolean, onesignalId: string | null): Promise<void> {
  if (!phoneDigits) return;
  try {
    if (optedIn) {
      await (supabase as any).from("push_subscribers").upsert(
        { customer_phone: phoneDigits, onesignal_id: onesignalId, updated_at: new Date().toISOString() },
        { onConflict: "customer_phone" },
      );
    } else {
      await (supabase as any).from("push_subscribers").delete().eq("customer_phone", phoneDigits);
    }
  } catch {
    // Table may not exist yet if the migration hasn't been run — ignore.
  }
}

/* ─── Tag a user after purchase ─────────────────────────────────────────── */
export function setOneSignalTags(tags: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.User.addTags(tags);
  });
}

/* ─── Identify user by phone — links device to external_id in OneSignal ─── */
export function loginOneSignalUser(externalId: string): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.login(externalId);
    const optedIn = !!OneSignal?.User?.PushSubscription?.optedIn;
    const subId    = OneSignal?.User?.PushSubscription?.id || null;
    recordPushOptIn(externalId, optedIn, subId);
  });
}

/* ─── Prompt permission slidedown programmatically (for /renew page) ──────
   Call this when a WhatsApp customer hits the renew page so they get linked
   to push without needing to wait for the 2-pageview delay. ──────────── */
export function promptPushPermission(): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.Slidedown.promptPush();
  });
}

/* ─── Logout ─────────────────────────────────────────────────────────────── */
export function logoutOneSignalUser(): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.logout();
  });
                  }
