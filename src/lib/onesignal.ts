const ONESIGNAL_APP_ID = "03fb7168-1d9c-4fb9-8064-01a8c6333053";
const SUPABASE_URL = "https://wtdsudcxjthmolfypexc.supabase.co";

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
      appId: ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      serviceWorkerParam: { scope: "/" },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage:
                  "Get notified about new streaming deals, drops & Axxess news 🎬",
                acceptButton: "Yes, notify me",
                cancelButton: "Maybe later",
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

    /* Push subscription observer — fires the moment a device goes from
       unsubscribed to subscribed (i.e. the instant permission is granted),
       not just at checkout. Triggers an in-app message AND sends a
       one-time welcome push via the edge function. */
    OneSignal.User.PushSubscription.addEventListener(
      "change",
      (event: any) => {
        const prev = event.previous?.id;
        const curr = event.current?.id;
        const justSubscribed = (!prev || prev === "") && curr && curr !== "";

        if (justSubscribed) {
          OneSignal.InAppMessages.addTrigger(
            "ai_implementation_campaign_email_journey",
            "true",
          );
          sendWelcomePush(curr);
        }
      },
    );
  });
}

/* ─── Welcome push ────────────────────────────────────────────────────────
   Fires once per device the moment push permission is granted. Calls the
   send-welcome-push edge function (server-side, holds the OneSignal REST
   API key) rather than calling OneSignal's REST API directly from the
   client, since that key must never be exposed in browser code.
   Fails silently — a missed welcome push should never block the UI. ──── */
async function sendWelcomePush(subscriptionId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
  } catch (err) {
    console.error("Welcome push failed:", err);
  }
}

/* ─── Tag a user (e.g. after purchase) ───────────────────────────────────── */
export function setOneSignalTags(tags: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.User.addTags(tags);
  });
}

/* ─── Identify user by phone ─────────────────────────────────────────────── */
export function loginOneSignalUser(externalId: string): void {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.login(externalId);
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
