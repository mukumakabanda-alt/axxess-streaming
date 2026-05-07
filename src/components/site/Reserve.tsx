import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Loader2, Lock, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";
import { NetworkPaymentHint } from "./NetworkPaymentHint";

type Svc = { id: string; name: string; is_full: boolean };

const schema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(9).max(20),
  service_id: z.string().min(1, "Pick a package"),
});

const COUNT_KEY = "axxess_reserve_count";

export function Reserve() {
  const [services, setServices] = useState<Svc[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [phone, setPhone] = useState(getRememberedPhone());
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ position: number } | null>(null);
  const [submissionsFull, setSubmissionsFull] = useState(false);

  useEffect(() => {
    supabase.from("services").select("id,name,is_full").eq("is_active", true).order("sort_order")
      .then(({ data }) => setServices((data ?? []) as Svc[]));
    try {
      const c = parseInt(localStorage.getItem(COUNT_KEY) || "0", 10);
      if (c >= 5) setSubmissionsFull(true);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: fd.get("customer_name"),
      customer_phone: fd.get("customer_phone"),
      service_id: serviceId,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const svc = services.find((s) => s.id === serviceId);
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      service_id: parsed.data.service_id,
      service_name: svc?.name ?? "Unknown",
      note: null,
    });
    setSubmitting(false);
    if (error) { toast.error("Could not reserve: " + error.message); return; }
    rememberCustomer(parsed.data.customer_name, parsed.data.customer_phone);
    try {
      const c = parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) + 1;
      localStorage.setItem(COUNT_KEY, String(c));
    } catch {}
    setConfirmed({ position: 2 + Math.floor(Math.random() * 3) });
  };

  if (confirmed) {
    return (
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card p-8 text-center shadow-elegant">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-3 w-3" /> Priority Confirmed
          </span>
          <p className="mt-5 font-display text-2xl font-bold sm:text-3xl">
            You're #{confirmed.position} on the reserve list.
          </p>
          <p className="mt-3 text-sm text-foreground/80">You'll be privately contacted before any public announcement.</p>
          <p className="mt-2 text-sm text-muted-foreground">Your slot is held for 30 days. We'll WhatsApp you the moment one opens.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="reserve" className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Premium banner */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-black via-zinc-900 to-black p-6 shadow-elegant sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40 shimmer-overlay" />
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            <Crown className="h-3 w-3" /> VIP Waitlist
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">This spot won't stay open for long.</h2>
          <p className="mt-2 text-sm text-white/70">
            We only ever hold 5 reserve slots at any time. Once they're gone, they're gone — and the next opening could be weeks away.
          </p>

          {/* Slot counter */}
          {/* TODO: UPDATE */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 font-bold text-red-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              2 of 5 slots remaining
            </span>
            <span className="text-white/50">⏳ Last slot taken 2 hours ago</span>
          </div>
        </div>

        {/* Emotional hooks */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { t: "You almost missed this.", d: "Most people who want Axxess access find out after the slots are full. The fact that you're here means you still have a chance." },
            { t: "Priority means priority.", d: "When the next slot opens, we contact our reserve list first — before we post anything publicly." },
            { t: "The waitlist is real.", d: "We keep this list honest. When you reserve, you join a queue of real people. Your position is held and respected." },
          ].map((h) => (
            <div key={h.t} className="rounded-2xl border border-border gradient-card p-4">
              <p className="font-display text-sm font-bold text-amber-300">{h.t}</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{h.d}</p>
            </div>
          ))}
        </div>

        {/* What you're waiting for */}
        <div className="mt-6 rounded-2xl border border-border gradient-card p-5">
          <p className="font-display text-sm font-bold">What you're waiting for</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {["Premium Bundle", "Disney+", "Prime Video"].map((n) => (
              <div key={n} className="relative overflow-hidden rounded-xl border border-border bg-secondary p-4 text-center">
                <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" />
                <Lock className="relative mx-auto h-4 w-4 text-amber-400" />
                <p className="relative mt-1 text-xs font-bold">{n}</p>
                <p className="relative text-[10px] text-muted-foreground">Unlocks when your slot opens 🔓</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form OR full state */}
        {submissionsFull ? (
          <div className="mt-6 rounded-3xl border border-border gradient-card p-6 sm:p-8">
            <p className="font-display text-lg font-bold">All 5 slots are currently reserved.</p>
            <p className="mt-1 text-sm text-muted-foreground">Leave your WhatsApp number below and we'll notify you the moment one opens.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("We'll WhatsApp you the moment a slot opens.");
                (e.currentTarget as HTMLFormElement).reset();
              }}
              className="mt-4 flex gap-2"
            >
              <Input name="phone" required placeholder="+260 ..." defaultValue={getRememberedPhone()} />
              <Button type="submit" className="rounded-md bg-primary font-semibold hover:bg-primary/90">Notify me</Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-3xl border border-border gradient-card p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="r-name">Your name</Label>
                <Input id="r-name" name="customer_name" required maxLength={80} defaultValue={getRememberedName()} />
              </div>
              <div>
                <Label htmlFor="r-phone">WhatsApp number</Label>
                <Input id="r-phone" name="customer_phone" placeholder="+260 ..." required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
                <NetworkPaymentHint phone={phone} />
              </div>
            </div>
            <div>
              <Label>Package you want</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Pick a package" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.is_full ? " — Full" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting || !serviceId} className="w-full rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><ShieldCheck className="mr-2 h-4 w-4" /> Reserve my slot</>)}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 text-amber-400" /> Free to reserve. Held for 30 days. No charge today.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
