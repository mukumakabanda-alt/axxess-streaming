import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Unlock, Copy, Check, ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";
import { toast } from "sonner";

type Service = { id: string; name: string; price_kwacha: number };
type Step = "details" | "pay" | "checking" | "verify";
type Network = "mtn" | "airtel" | "unknown";

const MTN_PREFIXES = ["96", "76"];
const AIRTEL_PREFIXES = ["97", "77", "95", "75"]; // 95/75 (Zamtel) routed to Airtel per spec

function detectNetwork(raw: string): Network {
  const digits = raw.replace(/\D/g, "");
  // strip leading 260 or 0
  let local = digits;
  if (local.startsWith("260")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  const prefix = local.slice(0, 2);
  if (MTN_PREFIXES.includes(prefix)) return "mtn";
  if (AIRTEL_PREFIXES.includes(prefix)) return "airtel";
  return "unknown";
}

const PAY_DETAILS = {
  mtn: { name: "Stanley Kabanda", number: "0765101494", label: "MTN", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40" },
  airtel: { name: "Ngoma Audrian", number: "0574161927", label: "Airtel", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40" },
};

const WA_NUMBER = WHATSAPP_PRIMARY;

export function CheckoutFlow({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState(getRememberedName());
  const [phone, setPhone] = useState(getRememberedPhone());
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [statusText, setStatusText] = useState("Checking payment…");

  useEffect(() => {
    if (service) {
      setStep("details");
      setName(getRememberedName());
      setPhone(getRememberedPhone());
      setCopied(false);
      setUnlocked(false);
    }
  }, [service]);

  const network = useMemo(() => detectNetwork(phone), [phone]);
  const payInfo = network === "mtn" ? PAY_DETAILS.mtn : network === "airtel" ? PAY_DETAILS.airtel : null;

  if (!service) return null;

  const submitDetails = async () => {
    if (name.trim().length < 2) return toast.error("Enter your name");
    if (phone.trim().length < 9) return toast.error("Enter a valid WhatsApp number");
    if (!payInfo) return toast.error("We couldn't detect your network. Check the number.");

    setSubmitting(true);
    rememberCustomer(name, phone);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await supabase.from("orders").insert({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      service_id: service.id,
      service_name_snapshot: service.name,
      price_snapshot: service.price_kwacha,
      duration_days: 30,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);
    setStep("pay");
  };

  const copyAndDial = async () => {
    if (!payInfo) return;
    try {
      await navigator.clipboard.writeText(payInfo.number);
      setCopied(true);
    } catch {}
    // Try to open dialer with USSD
    window.location.href = "tel:*115%23";
    setTimeout(() => {
      setStep("checking");
      runCheckSequence();
    }, 600);
  };

  const runCheckSequence = () => {
    setStatusText("Checking payment…");
    setUnlocked(false);
    setTimeout(() => setStatusText("Payment processed"), 2000);
    setTimeout(() => setUnlocked(true), 2400);
    setTimeout(() => setStep("verify"), 5200);
  };

  const completeVerification = () => {
    const msg = `Hi, my name is ${name}. I've made payment for Axxess Streaming (${service.name}). My WhatsApp number is ${phone}. Please confirm my access.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const close = () => { setStep("details"); onClose(); };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-background sm:rounded-3xl">
        {/* Step indicator */}
        <div className="flex h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: step === "details" ? "25%" : step === "pay" ? "50%" : step === "checking" ? "75%" : "100%" }}
          />
        </div>

        <div className="px-6 pb-7 pt-6">
          {step === "details" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">Get Access</h2>
                <p className="mt-1 text-sm text-muted-foreground">Enter your details to continue</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{service.name}</p>
                <p className="mt-1 font-display text-3xl font-bold">K{Number(service.price_kwacha)}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="ck-name">Name</Label>
                  <Input id="ck-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoFocus />
                </div>
                <div>
                  <Label htmlFor="ck-phone">WhatsApp Number</Label>
                  <Input id="ck-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0765 101 494" inputMode="tel" />
                  {phone.length >= 3 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {network === "mtn" && <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 font-semibold text-yellow-400">● MTN Number</span>}
                      {network === "airtel" && <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-400">● Airtel Number</span>}
                      {network === "unknown" && phone.length >= 6 && <span className="text-muted-foreground">Network not detected — check number</span>}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={submitDetails} disabled={submitting} className="h-14 w-full rounded-full bg-primary text-base font-semibold shadow-glow-red hover:bg-primary/90">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {step === "pay" && payInfo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="font-display text-2xl font-bold">Send Payment</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pay <span className="font-bold text-foreground">K{Number(service.price_kwacha)}</span> for {service.name}</p>
              </div>

              <div className={`rounded-2xl border ${payInfo.border} ${payInfo.bg} p-5`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${payInfo.color}`}>{payInfo.label} Mobile Money</p>
                <p className="mt-3 text-sm text-muted-foreground">Send payment to:</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight">{payInfo.number}</p>
                <p className="mt-2 text-sm">Name: <span className="font-semibold">{payInfo.name}</span></p>
              </div>

              <Button onClick={copyAndDial} className="h-14 w-full rounded-full bg-primary text-base font-semibold shadow-glow-red hover:bg-primary/90">
                {copied ? <><Check className="mr-2 h-5 w-5" /> Copied — Opening *115#</> : <><Copy className="mr-2 h-5 w-5" /> Copy Number & Proceed</>}
              </Button>
              <button onClick={() => { setStep("checking"); runCheckSequence(); }} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
                I've already paid — continue
              </button>
            </div>
          )}

          {step === "checking" && (
            <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-300">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {!unlocked ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
                    <Lock className="h-12 w-12 text-primary" />
                  </>
                ) : (
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="absolute inset-2 rounded-full bg-primary/15" />
                    <Unlock className="h-14 w-14 text-primary animate-in zoom-in spin-in-12 duration-500" />
                  </div>
                )}
              </div>
              <p className="mt-8 font-display text-xl font-bold">{statusText}</p>
              <p className="mt-1 text-xs text-muted-foreground">{unlocked ? "Access granted" : "Please wait a moment"}</p>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Unlock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Complete Verification</h2>
                <p className="mt-1 text-sm text-muted-foreground">Tap below to finish your access request</p>
              </div>
              <Button onClick={completeVerification} className="h-14 w-full rounded-full text-base font-semibold text-black hover:opacity-90" style={{ backgroundColor: "#25D366" }}>
                <MessageCircle className="mr-2 h-5 w-5" /> Complete Verification
              </Button>
              <button onClick={close} className="block w-full text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
