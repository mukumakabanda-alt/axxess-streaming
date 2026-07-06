// Triggered by a Supabase Database Webhook on INSERT/UPDATE to public.updates.
// Broadcasts a push to all subscribed OneSignal users the first time a post
// goes live. Editing an already-published post later does NOT resend it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = "03fb7168-1d9c-4fb9-8064-01a8c6333053";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const ONESIGNAL_SEGMENT = "Active Subscriptions"; // matches the segment name in this OneSignal account's Audience > Segments page

async function sendBroadcast(heading: string, message: string) {
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
      included_segments: [ONESIGNAL_SEGMENT],
      headings: { en: heading },
      contents: { en: message },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

function truncate(text: string, max: number) {
  const clean = (text ?? "").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

Deno.serve(async (req: Request) => {
  // Verify shared secret set by the DB trigger. Without this, anyone could
  // POST arbitrary content and broadcast it as a push to every subscriber.
  const expected = Deno.env.get("NOTIFY_NEWS_SECRET");
  const provided = req.headers.get("x-notify-secret");
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), { status: 400 });
  }

  const eventType = payload?.type;
  const record = payload?.record;
  const oldRecord = payload?.old_record;

  if (!record || record.is_published !== true) {
    return new Response(JSON.stringify({ ok: true, skipped: "not published" }));
  }

  const justPublished =
    eventType === "INSERT" ||
    (eventType === "UPDATE" && oldRecord?.is_published !== true);

  if (!justPublished) {
    return new Response(JSON.stringify({ ok: true, skipped: "already published" }));
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: claimed, error: claimErr } = await supabase
    .from("notification_log")
    .insert({ entity_type: "update", entity_id: record.id, reminder_key: "news_broadcast" })
    .select()
    .single();

  if (claimErr) {
    if ((claimErr as any).code !== "23505") {
      console.error("claim insert failed", claimErr.message);
    }
    return new Response(JSON.stringify({ ok: true, skipped: "already sent" }));
  }

  const heading = truncate(record.title ?? "AXXESS News", 60);
  const message = truncate(record.body ?? "", 150);
  const { ok, body } = await sendBroadcast(heading, message);

  await supabase
    .from("notification_log")
    .update({ status: ok ? "sent" : "failed", onesignal_response: body })
    .eq("id", claimed.id);

  return new Response(JSON.stringify({ ok, oneSignalResponse: body }), {
    headers: { "Content-Type": "application/json" },
  });
});
