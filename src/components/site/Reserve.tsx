import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Svc = { id: string; name: string; is_full: boolean };

const schema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(9).max(20),
  service_id: z.string().min(1, "Pick a package"),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export function Reserve() {
  const [services, setServices] = useState<Svc[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("services")
      .select("id,name,is_full")
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
      note: fd.get("note") || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const svc = services.find((s) => s.id === serviceId);
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      service_id: parsed.data.service_id,
      service_name: svc?.name ?? "Unknown",
      note: parsed.data.note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not reserve: " + error.message);
      return;
    }
    toast.success("Slot reserved! We'll reach out as soon as space opens up.");
    (e.currentTarget as HTMLFormElement).reset();
    setServiceId("");
  };

  return (
    <section id="reserve" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border gradient-card p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Not ready yet? Reserve your slot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No money right now, or your favourite package is full? Save a spot — we'll
              hold it for <span className="font-semibold text-primary">1 full month</span> and message you the moment it's available.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="r-name">Your name</Label>
            <Input id="r-name" name="customer_name" required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="r-phone">WhatsApp number</Label>
            <Input id="r-phone" name="customer_phone" placeholder="+260 ..." required maxLength={20} />
          </div>
          <div className="sm:col-span-2">
            <Label>Package you want</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Pick a package" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.is_full ? " — Full" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="r-note">Note (optional)</Label>
            <Textarea id="r-note" name="note" rows={2} maxLength={300} placeholder="When do you expect to be ready?" />
          </div>
          <Button
            type="submit"
            disabled={submitting || !serviceId}
            className="sm:col-span-2 mt-2 rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reserve my slot"}
          </Button>
        </form>
      </div>
    </section>
  );
}
