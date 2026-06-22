// Called from the client (src/lib/onesignal.ts) the instant a device's push
// subscription goes from unsubscribed to subscribed — i.e. the moment
// someone grants push permission, not just at checkout.
//
// Sends a one-time welcome push to that specific OneSignal subscription ID.
// Deduplicated via notification_log so a flaky network retry, a double
// "change" event, or the listener re-firing never sends it twice for the
// same device.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = "03fb7168-1d9c-4fb9-8064-01a8c6333053";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const WELCOME_HEADING = "Welcome to AXXESS 🎬";
const WELCOME_BODY =
  "You're all set! We'll notify you about renewals, deals, and the latest streaming news.";

/* Derive a stable UUID from the OneSignal subscription ID string so we never
   insert a non-UUID value into the notification_log.entity_id uuid column.
   Uses SHA-256 of the string then formats the first 16 bytes as a v4-style UUID.
   Same input always produces the same output — dedup guarantee preserved. */
async function toUUID(str: string): Promise<string> {
  const encoded = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  const bytes   = new Uint8Array(hashBuf).slice(0, 16);
  // Force version 4 and variant bits so Postgres accepts it as a valid uuid
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

async function sendPush(subscriptionId: string) {
  if (!ONESIGNAL_API_KEY) {
    return { ok: false, body: { error: "Missing ONESIGNAL_REST_API_KEY secret" } };
  }
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      include_subscription_ids: [subscriptionId],
      headings: { en: WELCOME_HEADING },
      contents: { en: WELCOME_BODY },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

Deno.serve(async (req: Request) => {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), { status: 400 });
  }

  const subscriptionId = payload?.subscriptionId;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing subscriptionId" }),
      { status: 400 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Derive a stable UUID from the subscription ID string — same device always
  // maps to the same UUID, preserving the unique-constraint dedup guarantee
  // without ever violating the uuid column type.
  const entityId = await toUUID(subscriptionId);

  // Claim this subscription's welcome send. If the insert fails on the unique
  // constraint (23505), it's already been sent — skip silently.
  const { data: claimed, error: claimErr } = await supabase
    .from("notification_log")
    .insert({
      entity_type:    "subscription",
      entity_id:      entityId,
      reminder_key:   "welcome_push",
      customer_phone: subscriptionId, // stored for traceability — not a phone number here
    })
    .select()
    .single();

  if (claimErr) {
    if ((claimErr as any).code !== "23505") {
      console.error("claim insert failed", claimErr.message);
    }
    return new Response(JSON.stringify({ ok: true, skipped: "already sent" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { ok, body } = await sendPush(subscriptionId);

  await supabase
    .from("notification_log")
    .update({ status: ok ? "sent" : "failed", onesignal_response: body })
    .eq("id", claimed.id);

  return new Response(JSON.stringify({ ok, oneSignalResponse: body }), {
    headers: { "Content-Type": "application/json" },
  });
});
