import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, MessageCircle, Copy, Check, Zap, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";
import { WHATSAPP_PRIMARY, normalizePhone } from "@/lib/whatsapp";
import { loginOneSignalUser, setOneSignalTags } from "@/lib/onesignal";
import { toast } from "sonner";

type Service = { id: string; name: string; price_kwacha: number };
type Step = "details" | "pay" | "done";
type Network = "mtn" | "airtel" | "zamtel" | "unknown";
type PayPhase = "ready" | "dialed";

const MTN_PREFIXES = ["96", "76"];
const AIRTEL_PREFIXES = ["97", "77", "57"];
const ZAMTEL_PREFIXES = ["95", "75"];

// The USSD code customers dial to send mobile money. Encoded for use in a
// tel: link — encodeURIComponent turns "#" into "%23" while leaving "*"
// alone, which is exactly what mobile dialers expect to show "*115#".
const USSD_CODE = "*115#";
const USSD_TEL_HREF = `tel:${encodeURIComponent(USSD_CODE)}`;

function detectNetwork(raw: string): Network {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("260")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  const prefix = local.slice(0, 2);
  if (MTN_PREFIXES.includes(prefix)) return "mtn";
  if (AIRTEL_PREFIXES.includes(prefix)) return "airtel";
  if (ZAMTEL_PREFIXES.includes(prefix)) return "zamtel";
  return "unknown";
}

const PAY_DETAILS = {
  mtn: { name: "Stanley Kabanda", number: "0765101494", label: "MTN Mobile Money", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  airtel: { name: "Ngoma Audrian", number: "0574161927", label: "Airtel Money", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
  zamtel: { name: "Stanley Kabanda", number: "0765101494", label: "Zamtel / MTN Money", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
};

export function CheckoutFlow({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState(getRememberedName());
  const [phone, setPhone] = useState(getRememberedPhone());
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<"number" | null>(null);
  const [payPhase, setPayPhase] = useState<PayPhase>("ready");

  useEffect(() => {
    if (service) {
      setStep("details");
      setName(getRememberedName());
      setPhone(getRememberedPhone());
      setMonths(1);
      setCopied(null);
      setPayPhase("ready");
    }
  }, [service]);

  const network = useMemo(() => detectNetwork(phone), [phone]);
  const payInfo =
    network === "mtn" ? PAY_DETAILS.mtn :
    network === "airtel" ? PAY_DETAILS.airtel :
    network === "zamtel" ? PAY_DETAILS.zamtel : null;

  if (!service) return null;
  const totalPrice = Number(service.price_kwacha) * months;
  const isAllAccess = /all.?access|bundle/i.test(service.name);
  const isNetflix = /netflix/i.test(service.name);

  const submitDetails = async () => {
    if (name.trim().length < 2) return toast.error("Enter your full name");
    if (phone.trim().length < 9) return toast.error("Enter a valid WhatsApp number");
    if (!payInfo) return toast.error("Network not detected — check your number");

    setSubmitting(true);
    rememberCustomer(name, phone);

    // Normalize once so the OneSignal external_id and the customer_phone
    // stored in Supabase are identical — the backend reminder job matches
    // on this exact string, so any drift here breaks targeting silently.
    const normalizedPhone = normalizePhone(phone);

    // Tag user in OneSignal for targeted push notifications
    loginOneSignalUser(normalizedPhone);
    setOneSignalTags({
      plan: service.name,
      months: String(months),
      phone: normalizedPhone,
      last_order: new Date().toISOString().split("T")[0],
    });

    const durationDays = 30 * months;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    await supabase.from("orders").insert({
      customer_name: name.trim(),
      customer_phone: normalizedPhone,
      service_id: service.id,
      service_name_snapshot: months > 1 ? `${service.name} (${months} months)` : service.name,
      price_snapshot: totalPrice,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);
    setStep("pay");
  };

  // The single, idiot-proof "do everything for me" action:
  // 1. Copy our mobile money number to the clipboard.
  // 2. Open the phone's dialer with *115# already typed in, so all the
  //    customer has to do is tap the call button on their own phone.
  // Clipboard write and dialer launch are fired from the same tap so
  // mobile browsers don't block either as an unrelated, non-user-initiated
  // action. If clipboard access fails for any reason, the number is still
  // shown large on screen, so nothing blocks the customer from continuing.
  const copyAndPay = () => {
    if (!payInfo) return;

    navigator.clipboard?.writeText(payInfo.number).then(
      () => toast.success("Number copied! Opening your dialer…"),
      () => toast("Couldn't auto-copy — just use the number shown above."),
    );

    setCopied("number");
    setPayPhase("dialed");
    window.setTimeout(() => setCopied(null), 4000);

    // Hand off to the phone's native dialer, pre-filled with *115#.
    window.location.href = USSD_TEL_HREF;
  };

  const openWhatsApp = () => {
    const upsellLine = isAllAccess
      ? ""
      : isNetflix
      ? "\n\nP.S. — I'd also like to know about upgrading to All Access (Netflix + Prime Video for K140). Please let me know when you confirm my order."
      : "\n\nP.S. — I'd also like to know about upgrading to All Access (both Netflix + Prime for K140). Please mention it when you confirm.";

    const msg =
      `Hi Axxess! 👋 I've just sent payment.\n\n` +
      `*Name:* ${name.trim()}\n` +
      `*Plan:* ${service.name}${months > 1 ? ` (${months} months)` : ""}\n` +
      `*Amount Paid:* K${totalPrice}\n` +
      `*My Number:* ${phone.trim()}\n\n` +
      `Please confirm my payment and send me my profile/login details. Thank you! 🙏` +
      upsellLine;

    window.open(`https://wa.me/${WHATSAPP_PRIMARY}?text=${encodeURIComponent(msg)}`, "_blank");
    setStep("done");
  };

  const close = () => { setStep("details"); onClose(); };

  const progressWidth = step === "details" ? "33%" : step === "pay" ? "66%" : "100%";

  // Drives the checkmarks on the numbered instructions below — once the
  // customer has tapped "Copy and Pay Now", steps 1 and 2 are done.
  const paySteps = [
    `Tap "Copy and Pay Now" below`,
    `Your dialer opens with ${USSD_CODE} ready — tap the green call button on your phone`,
    `Follow the prompts, paste the number when it asks, and send K${totalPrice}`,
    `Come back here and tap "I've Paid — Confirm on WhatsApp"`,
  ];
  const paySepsCompleted = payPhase === "dialed" ? 2 : 0;

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-background sm:rounded-3xl max-h-[92dvh] flex flex-col">

        {/* Progress bar */}
        <div className="flex h-1 w-full bg-muted flex-shrink-0">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: progressWidth }} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pt-6 pb-2">

          {/* ── Step 1: Details ── */}
          {step === "details" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">Get Access</h2>
                <p className="mt-1 text-sm text-muted-foreground">Enter your details to continue</p>
              </div>

              {/* Plan summary */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{service.name}</p>
                <p className="mt-1 font-display text-3xl font-bold">
                  K{totalPrice}
                  <span className="text-sm font-normal text-muted-foreground">
                    {months > 1 ? ` / ${months} months` : "/month"}
                  </span>
                </p>
                {months > 1 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    K{Number(service.price_kwacha)} × {months} months
                  </p>
                )}
              </div>

              {/* Trust strip */}
              <div className="flex items-center justify-center gap-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span>⚡ 15-min activation</span>
                <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
                <span>🔒 No card needed</span>
                <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
                <span>✓ No contract</span>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="ck-name">Full Name</Label>
                  <Input
                    id="ck-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="ck-phone">WhatsApp Number</Label>
                  <Input
                    id="ck-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0765 101 494"
                    inputMode="tel"
                  />
                  {phone.length >= 3 && (
                    <div className="mt-2 text-xs">
                      {network === "mtn" && <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 font-semibold text-yellow-400">● MTN detected</span>}
                      {network === "airtel" && <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-400">● Airtel detected</span>}
                      {network === "zamtel" && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-400">● Zamtel detected</span>}
                      {network === "unknown" && phone.length >= 6 && <span className="text-muted-foreground">Network not detected — check number</span>}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <Label>Duration</Label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 6].map((m) => {
                      const active = months === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMonths(m)}
                          className={`relative rounded-xl border px-2 py-2 text-center transition-all ${
                            active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <div className="text-sm font-bold leading-tight">{m}<span className="text-[10px] font-normal"> mo</span></div>
                          <div className="text-[10px] leading-tight opacity-80">K{Number(service.price_kwacha) * m}</div>
                          {m >= 3 && active && (
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-black">SAVE</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Pay once, enjoy longer. No need to renew every month.</p>
                </div>

                {/* Upsell nudge — only show if not already on All Access */}
                {!isAllAccess && (
                  <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
                    <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <span className="font-bold" style={{ color: "#C9A84C" }}>Upgrade tip:</span> Get Netflix + Prime Video together for just K140/mo.{" "}
                      <button
                        type="button"
                        onClick={onClose}
                        className="underline"
                        style={{ color: "#C9A84C" }}
                      >
                        See All Access
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Pay ── */}
          {step === "pay" && payInfo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">Send Payment</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send <span className="font-bold text-foreground">K{totalPrice}</span> via mobile money then confirm on WhatsApp
                </p>
              </div>

              {/* Network breadcrumb */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${payInfo.dot}`} />
                  {payInfo.label}
                </span>
                <span>›</span>
                <span>K{totalPrice}</span>
                <span>›</span>
                <span>Confirm on WhatsApp</span>
              </div>

              {/* Payment box */}
              <div className={`rounded-2xl border ${payInfo.border} ${payInfo.bg} p-5`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold uppercase tracking-wider ${payInfo.color}`}>{payInfo.label}</p>
                  {copied === "number" && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3" /> Copied
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Send to this number:</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight">{payInfo.number}</p>
                <p className="mt-2 text-sm">Name: <span className="font-semibold">{payInfo.name}</span></p>
                <div className="mt-3 rounded-xl bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Amount to send</p>
                  <p className="text-xl font-bold text-foreground">K{totalPrice}</p>
                </div>
              </div>

              {/* Steps — checkmarks fill in automatically as the customer progresses */}
              <div className="space-y-2">
                {paySteps.map((s, i) => {
                  const done = i < paySepsCompleted;
                  return (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        done ? "bg-emerald-500 text-black" : "bg-primary/15 text-primary"
                      }`}>
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className={`leading-snug ${done ? "text-foreground/60 line-through" : "text-muted-foreground"}`}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in duration-300 space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(37,211,102,0.12)", border: "2px solid rgba(37,211,102,0.3)" }}>
                <MessageCircle className="h-10 w-10" style={{ color: "#25D366" }} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">You're on WhatsApp!</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  Send the message to confirm your payment. We'll reply with your login details within 15 minutes.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-left w-full text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1 text-sm">Your message includes:</p>
                <p>✓ Your name & plan</p>
                <p>✓ Amount paid (K{totalPrice})</p>
                <p>✓ Your WhatsApp number</p>
                <p>✓ Request for login details</p>
                {!isAllAccess && <p style={{ color: "#C9A84C" }}>✓ All Access upgrade enquiry</p>}
              </div>

              {/* Upsell on done screen */}
              {!isAllAccess && (
                <div className="w-full rounded-2xl p-4 text-left" style={{ background: "linear-gradient(135deg, rgba(229,25,42,0.08), rgba(201,168,76,0.05))", border: "1px solid rgba(229,25,42,0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#E5192A" }}>💡 While you wait</p>
                  <p className="text-sm font-semibold text-white mb-0.5">Love what you ordered?</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Next time consider All Access — Netflix + Prime Video for K140/mo. Your Axxess agent will tell you more.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Sticky CTA ── */}
        <div className="flex-shrink-0 px-6 pb-6 pt-3 border-t border-border bg-background">
          {step === "details" && (
            <Button
              onClick={submitDetails}
              disabled={submitting}
              className="h-14 w-full rounded-full bg-primary text-base font-semibold hover:bg-primary/90"
              style={{ boxShadow: "0 0 32px -8px rgba(229,25,42,0.5)" }}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          )}

          {/* One giant button at a time — never two competing actions on screen */}
          {step === "pay" && (
            <div className="space-y-2">
              {payPhase === "ready" ? (
                <>
                  <Button
                    onClick={copyAndPay}
                    className="h-16 w-full rounded-full text-base font-bold text-white hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #E5192A, #C9A84C)", boxShadow: "0 0 28px -6px rgba(229,25,42,0.6)" }}
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    Copy and Pay Now
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Copies our number & opens your dialer with {USSD_CODE}
                  </p>
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="block w-full text-center text-[10px] text-muted-foreground/70 underline"
                  >
                    Already sent the money? Skip to WhatsApp
                  </button>
                </>
              ) : (
                <>
                  <Button
                    onClick={openWhatsApp}
                    className="h-16 w-full rounded-full text-base font-bold text-black hover:opacity-90 animate-pulse"
                    style={{ background: "#25D366", boxShadow: "0 0 28px -6px rgba(37,211,102,0.7)" }}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    I've Paid — Confirm on WhatsApp
                  </Button>
                  <button
                    type="button"
                    onClick={copyAndPay}
                    className="flex w-full items-center justify-center gap-1 text-center text-[11px] text-muted-foreground underline"
                  >
                    <Phone className="h-3 w-3" /> Didn't dial yet? Tap to copy number & reopen dialer
                  </button>
                </>
              )}
            </div>
          )}

          {step === "done" && (
            <Button
              onClick={close}
              variant="outline"
              className="h-14 w-full rounded-full text-base font-semibold"
            >
              Close
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
  }
