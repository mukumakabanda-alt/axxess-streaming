// Runs daily on a schedule (set up via Supabase Cron, pointing at this
// function). Sends subscription expiry reminders (7/5/3/1 days out, plus
// expired) and abandoned-order reminders (1h/24h/72h after order creation).
// Every send is logged in notification_log first — if the log insert fails
// because it already exists, the reminder is skipped, so nothing ever sends
// twice even if this function runs more than once on the same day.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = "03fb7168-1d9c-4fb9-8064-01a8c6333053";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

async function sendPush(externalId: string, heading: string, message: string) {
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
      include_aliases: { external_id: [externalId] },
      headings: { en: heading },
      contents: { en: message },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

async function claimAndSend(
  supabase: any,
  entityType: "subscription" | "order",
  entityId: string,
  reminderKey: string,
  phone: string,
  heading: string,
  message: string,
): Promise<"sent" | "failed" | "skipped"> {
  const { data: claimed, error: claimErr } = await supabase
    .from("notification_log")
    .insert({ entity_type: entityType, entity_id: entityId, reminder_key: reminderKey, customer_phone: phone })
    .select()
    .single();

  if (claimErr) {
    if ((claimErr as any).code !== "23505") {
      console.error("claim insert failed", entityType, entityId, reminderKey, claimErr.message);
    }
    return "skipped";
  }

  const phoneDigits = phone.replace(/\D/g, "");
  const { ok, body } = await sendPush(phoneDigits, heading, message);

  await supabase
    .from("notification_log")
    .update({ status: ok ? "sent" : "failed", onesignal_response: body })
    .eq("id", claimed.id);

  return ok ? "sent" : "failed";
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  const results = { subscriptions: 0, orders: 0, skipped: 0, failed: 0 };

  // ---------- Subscription expiry reminders ----------
  const windowStart = new Date(todayUTC); windowStart.setUTCDate(windowStart.getUTCDate() - 3);
  const windowEnd   = new Date(todayUTC); windowEnd.setUTCDate(windowEnd.getUTCDate() + 8);

  const { data: subs, error: subsErr } = await supabase
    .from("subscriptions")
    .select("id, customer_phone, customer_name, service_name, end_date")
    .eq("is_active", true)
    .gte("end_date", toDateStr(windowStart))
    .lte("end_date", toDateStr(windowEnd));

  if (subsErr) console.error("Failed to load subscriptions:", subsErr.message);

  const SUB_MESSAGES: Record<string, { heading: string; body: string }> = {
    "7_day":   { heading: "AXXESS", body: "Your AXXESS subscription expires in 7 days. Renew now to keep access." },
    "5_day":   { heading: "AXXESS", body: "5 days left on your AXXESS subscription." },
    "3_day":   { heading: "AXXESS", body: "Only 3 days left before your AXXESS access ends." },
    "1_day":   { heading: "AXXESS", body: "Your AXXESS subscription expires tomorrow." },
    "expired": { heading: "AXXESS", body: "Your AXXESS subscription has expired. Renew now to restore access." },
  };

  for (const sub of subs ?? []) {
    if (!sub.customer_phone) { results.skipped++; continue; }

    const endDate  = new Date(sub.end_date + "T00:00:00Z");
    const daysLeft = Math.round((endDate.getTime() - todayUTC.getTime()) / 86400000);

    let reminderKey: string | null = null;
    if      (daysLeft === 7) reminderKey = "7_day";
    else if (daysLeft === 5) reminderKey = "5_day";
    else if (daysLeft === 3) reminderKey = "3_day";
    else if (daysLeft === 1) reminderKey = "1_day";
    else if (daysLeft <= 0)  reminderKey = "expired";

    if (!reminderKey) { results.skipped++; continue; }

    const msg     = SUB_MESSAGES[reminderKey];
    const outcome = await claimAndSend(supabase, "subscription", sub.id, reminderKey, sub.customer_phone, msg.heading, msg.body);
    if (outcome === "sent")   results.subscriptions++;
    else if (outcome === "failed") results.failed++;
    else results.skipped++;
  }

  // ---------- Abandoned order reminders ----------
  // Matches orders where CheckoutFlow inserted a row but the customer never
  // completed payment. CheckoutFlow relies on DB defaults:
  //   status         DEFAULT 'pending'
  //   payment_status DEFAULT 'unpaid'
  // Both filters are explicit here so the query is correct regardless of
  // whether the client sets them or leaves them to the DB default.
  const orderWindowStart = new Date(now);
  orderWindowStart.setUTCDate(orderWindowStart.getUTCDate() - 8);

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, customer_phone, customer_name, created_at, status, payment_status")
    .eq("status", "pending")
    .eq("payment_status", "unpaid")
    .gte("created_at", orderWindowStart.toISOString())
    .order("created_at", { ascending: false });

  if (ordersErr) console.error("Failed to load orders:", ordersErr.message);

  const ORDER_MESSAGES: Record<string, { heading: string; body: string; hours: number }> = {
    "1h":  { heading: "AXXESS", body: "Your AXXESS order is still pending. Complete payment to get access.", hours: 1 },
    "24h": { heading: "AXXESS", body: "You started an order with us yesterday. Complete it now to start streaming.", hours: 24 },
    "72h": { heading: "AXXESS", body: "Your order is still waiting. Finish now before it closes.", hours: 72 },
  };

  for (const order of orders ?? []) {
    if (!order.customer_phone) { results.skipped++; continue; }

    const createdAt = new Date(order.created_at);
    const ageHours  = (now.getTime() - createdAt.getTime()) / 3600000;

    for (const [reminderKey, msg] of Object.entries(ORDER_MESSAGES)) {
      if (ageHours < msg.hours) continue;
      const outcome = await claimAndSend(supabase, "order", order.id, reminderKey, order.customer_phone, msg.heading, msg.body);
      if (outcome === "sent")        results.orders++;
      else if (outcome === "failed") results.failed++;
      else results.skipped++;
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
