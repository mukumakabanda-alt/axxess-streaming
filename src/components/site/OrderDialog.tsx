import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, Loader2 } from "lucide-react";
import { WHATSAPP_PRIMARY, waLink, orderMessage } from "@/lib/whatsapp";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";
import { z } from "zod";

type Service = {
  id: string;
  name: string;
  price_kwacha: number;
};

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is too short").max(80),
  customer_phone: z.string().trim().min(9, "Enter a valid phone").max(20),
  referral_code: z.string().trim().max(20).optional().or(z.literal("")),
});

export function OrderDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const isTrial = typeof window !== "undefined" && sessionStorage.getItem("axx_trial") === "1";

  if (!service) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: fd.get("customer_name"),
      customer_phone: fd.get("customer_phone"),
      referral_code: fd.get("referral_code") || "",
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const days = isTrial ? 2 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const { error } = await supabase.from("orders").insert({
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: null,
      service_id: service.id,
      service_name_snapshot: service.name,
      price_snapshot: isTrial ? 0 : service.price_kwacha,
      notes: isTrial ? "[FREE 2-DAY TRIAL]" : null,
      referral_code: parsed.data.referral_code || null,
      duration_days: days,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);

    if (error) {
      toast.error("Could not submit order. Please try WhatsApp instead.");
      return;
    }

    rememberCustomer(parsed.data.customer_name, parsed.data.customer_phone);
    setDone(true);
  };

  const close = () => {
    setDone(false);
    try { sessionStorage.removeItem("axx_trial"); } catch {}
    onClose();
  };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!done ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {isTrial ? `Start your 2-day free trial — ${service.name}` : `Order ${service.name}`}
              </DialogTitle>
              <DialogDescription>
                {isTrial
                  ? "No payment today. Fill in your details and we'll set up your free 2-day trial on WhatsApp."
                  : `K${Number(service.price_kwacha)}/month — fill in your details and we'll confirm on WhatsApp.`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="customer_name">Full name *</Label>
                <Input id="customer_name" name="customer_name" required maxLength={80} defaultValue={getRememberedName()} />
              </div>
              <div>
                <Label htmlFor="customer_phone">WhatsApp number *</Label>
                <Input id="customer_phone" name="customer_phone" placeholder="+260 ..." required maxLength={20} defaultValue={getRememberedPhone()} />
              </div>
              <div>
                <Label htmlFor="referral_code">Referral code (optional)</Label>
                <Input id="referral_code" name="referral_code" maxLength={20} />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary py-6 text-base font-semibold shadow-glow-red hover:bg-primary/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isTrial ? "Start Free Trial" : "Submit Order")}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">Order received!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Status: <span className="font-semibold text-foreground">Pending Review</span>.<br />
              Send us a quick WhatsApp message to complete payment & receive your access details.
            </p>

            <a
              href={waLink(WHATSAPP_PRIMARY, orderMessage(service.name, Number(service.price_kwacha)))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-black"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" />
              Continue on WhatsApp
            </a>
            <button
              onClick={close}
              className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
    }
