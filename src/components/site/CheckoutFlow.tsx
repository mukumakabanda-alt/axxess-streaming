import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, MessageCircle, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";
import { toast } from "sonner";

type Service = { id: string; name: string; price_kwacha: number };
type Step = "details" | "pay" | "done";
type Network = "mtn" | "airtel" | "zamtel" | "unknown";

const MTN_PREFIXES = ["96", "76"];
const AIRTEL_PREFIXES = ["97", "77", "57"];
const ZAMTEL_PREFIXES = ["95", "75"];

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

  useEffect(() => {
    if (service) {
      setStep("details");
      setName(getRememberedName());
      setPhone(getRememberedPhone());
      setMonths(1);
      setCopied(null);
    }
  }, [service]);

  const network = useMemo(() => detectNetwork(phone), [phone]);
  const payInfo = network === "mtn" ? PAY_DETAILS.mtn : network === "airtel" ? PAY_DETAILS.airtel : network === "zamtel" ? PAY_DETAILS.zamtel : null;

  if (!service) return null;
  const totalPrice = Number(service.price_kwacha) * months;

  const submitDetails = async () => {
    if (name.trim().length < 2) return toast.error("Enter your full name");
    if (phone.trim().length < 9) return toast.error("Enter a valid WhatsApp number");
    if (!payInfo) return toast.error("Network not detected — check your number");
    setSubmitting(true);
    rememberCustomer(name, phone);
    const durationDays = 30 * months;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    await supabase.from("orders").insert({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      service_id: service.id,
      service_name_snapshot: months > 1 ? `${service.name} (${months} months)` : service.name,
      price_snapshot: totalPrice,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);
    setStep("pay");
  };

  const copyNumber = async () => {
    if (!payInfo) return;
    try {
      await navigator.clipboard.writeText(payInfo.number);
      setCopied("number");
      toast.success("Number copied!");
      setTimeout(() => setCopied(null), 3000);
    } catch {}
  };

  const openWhatsApp = () => {
    const msg =
      `Hi Axxess! 👋 I've just sent payment.\n\n` +
      `*Name:* ${name.trim()}\n` +
      `*Plan:* ${service.name}${months > 1 ? ` (${months} months)` : ""}\n` +
      `*Amount Paid:* K${totalPrice}\n` +
      `*My Number:* ${phone.trim()}\n\n` +
      `Please confirm my payment and send me my profile/login details. Thank you! 🙏`;
    window.open(`https://wa.me/${WHATSAPP_PRIMARY}?text=${encodeURIComponent(msg)}`, "_blank");
    setStep("done");
  };

  const close = () => { setStep("details"); onClose(); };

  const progressWidth = step === "details" ? "33%" : step === "pay" ? "66%" : "100%";

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
                <p className={`text-xs font-bold uppercase tracking-wider ${payInfo.color}`}>{payInfo.label}</p>
                <p className="mt-3 text-sm text-muted-foreground">Send to this number:</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-display text-3xl font-bold tracking-tight">{payInfo.number}</p>
                  <button
                    onClick={copyNumber}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-all hover:border-primary/40"
                  >
                    {copied === "number" ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
                <p className="mt-2 text-sm">Name: <span className="font-semibold">{payInfo.name}</span></p>
                <div className="mt-3 rounded-xl bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Amount to send</p>
                  <p className="text-xl font-bold text-foreground">K{totalPrice}</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {["Open your mobile money app or dial *115#", `Send K${totalPrice} to ${payInfo.number} (${payInfo.name})`, "Come back here and tap the button below"].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                    <span className="text-muted-foreground leading-snug">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300 space-y-4">
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
              </div>
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
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          )}

          {step === "pay" && (
            <div className="space-y-2">
              <Button
                onClick={openWhatsApp}
                className="h-14 w-full rounded-full text-base font-bold text-black hover:opacity-90"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                I've paid — confirm on WhatsApp
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                This opens WhatsApp with your order details pre-filled
              </p>
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
