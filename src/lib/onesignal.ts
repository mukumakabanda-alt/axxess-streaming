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

    /* Push subscription observer — fires when device gets a subscription ID */
    OneSignal.User.PushSubscription.addEventListener(
      "change",
      (event: any) => {
        const prev = event.previous?.id;
        const curr = event.current?.id;
        if ((!prev || prev === "") && curr && curr !== "") {
          OneSignal.InAppMessages.addTrigger(
            "ai_implementation_campaign_email_journey",
            "true",
          );
        }
      },
    );
  });
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
