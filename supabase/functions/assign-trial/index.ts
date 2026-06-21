// supabase/functions/assign-trial/index.ts
// ═══════════════════════════════════════════════════════════════
// Axxess Free Trial Assignment Edge Function
// POST { name, phone, service_preference: 'netflix' | 'prime' | 'any' }
// Returns { success, credentials } or { success: false, reason, full_services }
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ONESIGNAL_APP_ID  = "03fb7168-1d9c-4fb9-8064-01a8c6333053";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const ADMIN_PHONE       = "260770514809"; // Stanley — matches the external_id used everywhere else

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Normalise phone: strip all non-digit chars, keep leading +
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Zambian numbers: if starts with 0, replace with 260
  if (digits.startsWith("0") && digits.length === 10) return "260" + digits.slice(1);
  return digits;
}

// ── Send a push alert to the admin when a trial account becomes vulnerable.
//    Uses the REAL notification_log schema (entity_type/entity_id/reminder_key)
//    and actually sends the OneSignal push — the old version only inserted a
//    row with columns that don't exist on this table, so it always failed
//    silently and no alert was ever sent.
async function sendVulnerableAlert(
  supabase: ReturnType<typeof createClient>,
  account: { id: string; service: string; account_email: string }
) {
  const reminderKey = "vulnerable_alert";

  // Atomic claim — if this exact alert was already logged for this account, skip it.
  const { data: claimed, error: claimErr } = await supabase
    .from("notification_log")
    .insert({
      entity_type:    "order", // closest existing enum value; this is an internal admin alert, not customer-facing
      entity_id:      account.id,
      reminder_key:   reminderKey,
      customer_phone: ADMIN_PHONE,
    })
    .select()
    .single();

  if (claimErr) {
    // 23505 = unique violation = already alerted for this account, which is fine
    if ((claimErr as any).code !== "23505") {
      console.error("vulnerable alert claim failed:", claimErr.message);
    }
    return;
  }

  if (!ONESIGNAL_API_KEY) {
    console.error("Cannot send vulnerable alert: missing ONESIGNAL_REST_API_KEY secret");
    await supabase
      .from("notification_log")
      .update({ status: "failed", onesignal_response: { error: "Missing ONESIGNAL_REST_API_KEY secret" } })
      .eq("id", claimed.id);
    return;
  }

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: "push",
        include_aliases: { external_id: [ADMIN_PHONE] },
        headings: { en: "⚠️ Vulnerable trial account" },
        contents: {
          en: `${account.service.toUpperCase()} account ${account.account_email} is now VULNERABLE. Change the PIN before reassigning.`,
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    await supabase
      .from("notification_log")
      .update({ status: res.ok ? "sent" : "failed", onesignal_response: body })
      .eq("id", claimed.id);
  } catch (err) {
    console.error("vulnerable alert push failed:", err);
    await supabase
      .from("notification_log")
      .update({ status: "failed", onesignal_response: { error: String(err) } })
      .eq("id", claimed.id);
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, phone, service_preference = "any" } = await req.json();

    // ── Validate inputs
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return Response.json(
        { success: false, reason: "invalid_input", message: "Please enter your full name." },
        { headers: corsHeaders, status: 400 }
      );
    }
    if (!phone || typeof phone !== "string") {
      return Response.json(
        { success: false, reason: "invalid_input", message: "Please enter your WhatsApp number." },
        { headers: corsHeaders, status: 400 }
      );
    }

    const normPhone = normalisePhone(phone.trim());
    if (normPhone.length < 9) {
      return Response.json(
        { success: false, reason: "invalid_input", message: "Enter a valid WhatsApp number." },
        { headers: corsHeaders, status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── DUPLICATE CHECK: phone is the unique key, not name
    const { data: existingClaim } = await supabase
      .from("trial_claims")
      .select("id, service, claimed_at")
      .eq("phone", normPhone)
      .maybeSingle();

    if (existingClaim) {
      return Response.json({
        success:  false,
        reason:   "already_claimed",
        message:  "This number has already been used for a free trial. Each number can only claim one trial.",
        service:  existingClaim.service,
        claimed_at: existingClaim.claimed_at,
      }, { headers: corsHeaders });
    }

    // ── Build service priority order
    // If preference is 'netflix' → try Netflix first, then Prime
    // If preference is 'prime'   → try Prime first, then Netflix
    // If 'any'                   → Netflix first (default)
    const order: Array<"netflix" | "prime"> =
      service_preference === "prime"
        ? ["prime", "netflix"]
        : ["netflix", "prime"];

    let assigned: {
      account_id:    string;
      service:       string;
      account_email: string;
      account_password: string;
      profile_name:  string | null;
      pin:           string | null;
      expires_at:    string;
    } | null = null;

    const fullServices: string[] = [];

    for (const svc of order) {
      // Find a CLEAN (not vulnerable) available slot for this service
      const { data: slot } = await supabase
        .from("trial_accounts")
        .select("id, service, account_email, account_password, profile_name, pin")
        .eq("service", svc)
        .eq("status", "available")
        .eq("is_vulnerable", false)
        .limit(1)
        .maybeSingle();

      if (!slot) {
        // No clean slot — check if there's a VULNERABLE one we should alert about
        const { data: vulnerableSlot } = await supabase
          .from("trial_accounts")
          .select("id, service, account_email")
          .eq("service", svc)
          .eq("status", "available")
          .eq("is_vulnerable", true)
          .limit(1)
          .maybeSingle();

        if (vulnerableSlot) {
          await sendVulnerableAlert(supabase, {
            id: vulnerableSlot.id,
            service: vulnerableSlot.service,
            account_email: vulnerableSlot.account_email,
          });
        }

        fullServices.push(svc);
        continue;
      }

      // ── Assign it
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // 2-day trial

      const { error: updateErr } = await supabase
        .from("trial_accounts")
        .update({
          status:           "assigned",
          assigned_to_name:  name.trim(),
          assigned_to_phone: normPhone,
          assigned_at:       new Date().toISOString(),
          expires_at:        expiresAt.toISOString(),
        })
        .eq("id", slot.id);

      if (updateErr) {
        console.error("Failed to assign slot:", updateErr);
        fullServices.push(svc);
        continue;
      }

      // ── Record the claim (phone lock)
      await supabase.from("trial_claims").insert({
        phone:      normPhone,
        name:       name.trim(),
        service:    svc,
        account_id: slot.id,
      });

      assigned = {
        account_id:       slot.id,
        service:          svc,
        account_email:    slot.account_email,
        account_password: slot.account_password,
        profile_name:     slot.profile_name,
        pin:              slot.pin,
        expires_at:       expiresAt.toISOString(),
      };
      break;
    }

    // ── Nothing available
    if (!assigned) {
      return Response.json({
        success:       false,
        reason:        "full",
        full_services: fullServices,
        message:       "All trial slots are currently full.",
      }, { headers: corsHeaders });
    }

    // ── Success
    return Response.json({
      success:     true,
      service:     assigned.service,
      credentials: {
        email:        assigned.account_email,
        password:     assigned.account_password,
        profile_name: assigned.profile_name,
        pin:          assigned.pin,
        expires_at:   assigned.expires_at,
      },
      name: name.trim(),
    }, { headers: corsHeaders });

  } catch (err) {
    console.error("assign-trial error:", err);
    return Response.json(
      { success: false, reason: "server_error", message: "Something went wrong. Please try WhatsApp directly." },
      { headers: corsHeaders, status: 500 }
    );
  }
});
