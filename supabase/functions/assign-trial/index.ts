// supabase/functions/assign-trial/index.ts
// ═══════════════════════════════════════════════════════════════
// Axxess Free Trial Assignment Edge Function
// POST { name, phone, service_preference: 'netflix' | 'prime' | 'any' }
// Returns { success, credentials } or { success: false, reason, full_services }
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ALERT   = "+260770514809"; // your number — alert target

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

// ── Send WhatsApp alert to Stanley via Supabase (just inserts a notification row)
async function sendVulnerableAlert(
  supabase: ReturnType<typeof createClient>,
  account: { id: string; service: string; account_email: string }
) {
  // Insert into notification_log so admin sees it; 
  // if you wire Twilio/WhatsApp API later this is where it goes
  await supabase.from("notification_log").insert({
    type:    "vulnerable_alert",
    title:   `⚠️ VULNERABLE: ${account.service.toUpperCase()} profile`,
    body:    `${account.account_email} is now VULNERABLE. Change the PIN before reassigning.`,
    meta:    { account_id: account.id, service: account.service },
  }).throwOnError().catch(() => {}); // non-blocking — don't fail the function if this errors
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
        // Check why: are there slots but all vulnerable?
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
