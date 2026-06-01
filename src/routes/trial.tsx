import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { WHATSAPP_PRIMARY, waLink, orderMessage } from "@/lib/whatsapp";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";

import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/trial")({
  head: () => ({
    meta: [
      { title: "Start Free Trial — Axxess Streaming" },
      { name: "description", content: "Start your 2-day free trial. Pick a package, enter your name and WhatsApp." },
    ],
  }),
  component: TrialPage,
});

type Svc = { id: string; name: string; price_kwacha: number; is_full: boolean };

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is too short").max(80),
  customer_phone: z.string().trim().min(9, "Enter a valid WhatsApp number").max(20),
  service_id: z.string().min(1, "Pick a package"),
});

function TrialPage() {
  const [services, setServices] = useState<Svc[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [phone, setPhone] = useState(getRememberedPhone());
  const [months, setMonths] = useState<number>(1);
  const [customMonths, setCustomMonths] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ name: string } | null>(null);
  const selectedSvc = services.find((s) => s.id === serviceId);
  const effectiveMonths = months === 0 ? customMonths : months;

  useEffect(() => {
    supabase
      .from("services")
      .select("id,name,price_kwacha,is_full")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data ?? []) as Svc[]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: fd.get("customer_name"),
      customer_phone: fd.get("customer_phone"),
      service_id: serviceId,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setSubmitting(true);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);
    const { error } = await supabase.from("orders").insert({
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: null,
      service_id: svc.id,
      service_name_snapshot: svc.name,
      price_snapshot: 0,
      notes: "[FREE 2-DAY TRIAL]",
      duration_days: 2,
      expires_at: expiresAt.toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not start trial. Please try WhatsApp.");
      return;
    }
    // Remember user, but DO NOT award points for free trial
    rememberCustomer(parsed.data.customer_name, parsed.data.customer_phone);
    setDone({ name: svc.name });
  };

  return (
    <SiteShell>
      <section className="px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> 2-Day Free Trial
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Start your free trial</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              No payment today. Pick a package, drop your name and WhatsApp, and we'll set you up.
            </p>
            <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2 text-[11px] font-semibold text-foreground/80 backdrop-blur">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> No card needed</span>
              <span className="text-border">|</span>
              <span>Cancel anytime</span>
            </div>
          </div>

          {!done ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-3xl border border-border gradient-card p-6 sm:p-8">
              <div>
                <Label>Pick a package *</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger><SelectValue placeholder="Choose a package" /></SelectTrigger>
                  <SelectContent>
                    {services.filter((s) => !s.is_full).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — K{s.price_kwacha}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="t-name">Full name *</Label>
                <Input id="t-name" name="customer_name" required maxLength={80} defaultValue={getRememberedName()} />
              </div>
              <div>
                <Label htmlFor="t-phone">WhatsApp number *</Label>
                <Input id="t-phone" name="customer_phone" placeholder="+260 ..." required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <Button
                type="submit"
                disabled={submitting || !serviceId}
                className="w-full rounded-full bg-primary py-6 text-base font-semibold shadow-glow-red hover:bg-primary/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Free Trial"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Trial lasts 2 days. Points are earned only on paid subscriptions.
              </p>
            </form>
          ) : (
            <div className="mt-8 rounded-3xl border border-border gradient-card p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold">You're in!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Free trial requested for <span className="font-semibold text-foreground">{done.name}</span>.
                Tap below to message us on WhatsApp and we'll send your access details.
              </p>
              <a
                href={waLink(WHATSAPP_PRIMARY, orderMessage(`${done.name} (FREE TRIAL)`, 0))}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-black"
                style={{ backgroundColor: "var(--color-spotify)" }}
              >
                <MessageCircle className="h-4 w-4" />
                Continue on WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
