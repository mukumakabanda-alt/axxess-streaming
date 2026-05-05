import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Copy, Trash2, Pencil, MessageSquare, Plus, Sparkles } from "lucide-react";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";
import { Switch } from "@/components/ui/switch";
import { recordRewardUnlocks } from "@/lib/rewards";

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name_snapshot: string;
  price_snapshot: number;
  status: "pending" | "approved" | "completed" | "rejected";
  payment_status: string;
  notes: string | null;
  admin_notes: string | null;
  referral_code: string | null;
  duration_days: number | null;
  expires_at: string | null;
  created_at: string;
};

const STATUSES = ["pending", "approved", "completed", "rejected"] as const;

export function OrdersTab() {
  const [items, setItems] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [serviceF, setServiceF] = useState<string>("all");
  const [editing, setEditing] = useState<Order | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);

  const [pointsByPhone, setPointsByPhone] = useState<Record<string, number>>({});

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Order[]);
    const uniq = Array.from(new Set((data ?? []).map((d: any) => d.service_name_snapshot)));
    setServices(uniq);
    // Fetch points for all unique phones
    const phones = Array.from(new Set((data ?? []).map((d: any) => d.customer_phone)));
    if (phones.length) {
      const { data: pts } = await supabase
        .from("customer_points")
        .select("customer_phone, points")
        .in("customer_phone", phones);
      const map: Record<string, number> = {};
      (pts ?? []).forEach((p: any) => { map[p.customer_phone] = p.points; });
      setPointsByPhone(map);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((o) => {
    const m = q.toLowerCase();
    const matchQ = !q || o.customer_name.toLowerCase().includes(m) || o.customer_phone.includes(m);
    const matchS = statusF === "all" || o.status === statusF;
    const matchSv = serviceF === "all" || o.service_name_snapshot === serviceF;
    return matchQ && matchS && matchSv;
  }), [items, q, statusF, serviceF]);

  const updateStatus = async (id: string, status: Order["status"]) => {
    const o = items.find((x) => x.id === id);
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);

    if (status === "approved" || status === "completed") {
      if (o) {
        // Avoid duplicate subscription
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("order_id", id)
          .maybeSingle();
        if (!existing) {
          const days = o.duration_days ?? 30;
          const start = new Date();
          const end = new Date(); end.setDate(end.getDate() + days);
          await supabase.from("subscriptions").insert({
            order_id: id,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            service_name: o.service_name_snapshot,
            start_date: start.toISOString().slice(0,10),
            end_date: end.toISOString().slice(0,10),
          });
          toast.success(`Subscription created (${days} days)`);
        }
      }
    }

    // Award points ONLY when status becomes "completed" AND it's a paid order (not a free trial)
    if (status === "completed" && o && Number(o.price_snapshot) > 0) {
      const { data: prev } = await supabase
        .from("customer_points")
        .select("points")
        .eq("customer_phone", o.customer_phone)
        .maybeSingle();
      const prevPoints = prev?.points ?? 0;
      const { data: newTotal } = await supabase.rpc("award_points", {
        _phone: o.customer_phone,
        _name: o.customer_name,
        _delta: 5,
        _reason: `Subscribed to ${o.service_name_snapshot}`,
      });
      const newPoints = (newTotal as number) ?? prevPoints + 5;
      await recordRewardUnlocks(o.customer_phone, o.customer_name, prevPoints, newPoints);

      // Award referrer 10 pts if referral_code present (also gated on completion)
      if (o.referral_code) {
        const { data: ref } = await supabase
          .from("referrals")
          .select("owner_phone, owner_name, uses_count")
          .eq("code", o.referral_code)
          .maybeSingle();
        if (ref) {
          const { data: refPrev } = await supabase
            .from("customer_points").select("points").eq("customer_phone", ref.owner_phone).maybeSingle();
          const refPrevPts = refPrev?.points ?? 0;
          const { data: refNew } = await supabase.rpc("award_points", {
            _phone: ref.owner_phone,
            _name: ref.owner_name,
            _delta: 10,
            _reason: `Friend used referral code ${o.referral_code}`,
          });
          await recordRewardUnlocks(ref.owner_phone, ref.owner_name, refPrevPts, (refNew as number) ?? refPrevPts + 10);
          await supabase.from("referrals")
            .update({ uses_count: (ref.uses_count ?? 0) + 1 })
            .eq("code", o.referral_code);
        }
      }
    }

    toast.success(`Marked ${status}`);
    load();
  };

  const toggleTrial = async (o: Order, makeTrial: boolean) => {
    const days = makeTrial ? 2 : 30;
    const expires = new Date(); expires.setDate(expires.getDate() + days);
    const newNotes = makeTrial
      ? (o.notes?.includes("[FREE 2-DAY TRIAL]") ? o.notes : `[FREE 2-DAY TRIAL] ${o.notes ?? ""}`.trim())
      : (o.notes ?? "").replace("[FREE 2-DAY TRIAL]", "").trim() || null;
    const newPrice = makeTrial ? 0 : o.price_snapshot;
    await supabase.from("orders").update({
      duration_days: days,
      expires_at: expires.toISOString(),
      notes: newNotes,
      price_snapshot: newPrice,
    }).eq("id", o.id);
    toast.success(makeTrial ? "Converted to free trial" : "Converted to normal order");
    load();
  };

  const updateDuration = async (id: string, days: number) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    await supabase.from("orders").update({ duration_days: days, expires_at: expires.toISOString() }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  };

  const copyReminder = (o: Order) => {
    const msg = `Hi ${o.customer_name}! 👋 This is Axxess Streaming. Your *${o.service_name_snapshot}* subscription is up for renewal. Renew today for just K${Number(o.price_snapshot)} and continue uninterrupted streaming. Reply here when you're ready 🎬🎶`;
    navigator.clipboard.writeText(msg);
    toast.success("Reminder copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone..." className="pl-9" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceF} onValueChange={setServiceF}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary"><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Days</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders</td></tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">
                    <p className="font-semibold">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                    {pointsByPhone[o.customer_phone] !== undefined && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                        ⭐ {pointsByPhone[o.customer_phone]} pts
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    {o.service_name_snapshot}
                    <p className="text-xs text-muted-foreground">K{Number(o.price_snapshot)}</p>
                  </td>
                  <td className="p-3">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as Order["status"])}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={1}
                      defaultValue={o.duration_days ?? 30}
                      onBlur={(e) => updateDuration(o.id, Number(e.target.value) || 30)}
                      className="h-8 w-20 text-xs"
                    />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <a href={`https://wa.me/${o.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 hover:bg-muted" title="WhatsApp customer">
                        <MessageSquare className="h-4 w-4" style={{ color: "var(--color-spotify)" }} />
                      </a>
                      <button onClick={() => copyReminder(o)} className="rounded-md p-1.5 hover:bg-muted" title="Copy renewal reminder">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditing(o)} className="rounded-md p-1.5 hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(o.id)} className="rounded-md p-1.5 hover:bg-muted text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader><DialogTitle>Order details</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Phone:</span> {editing.customer_phone}</p>
                <p><span className="text-muted-foreground">Email:</span> {editing.customer_email ?? "—"}</p>
                <p><span className="text-muted-foreground">Referral:</span> {editing.referral_code ?? "—"}</p>
                <p><span className="text-muted-foreground">Customer notes:</span> {editing.notes ?? "—"}</p>
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
                  <div>
                    <p className="font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Free trial</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle to convert between a paid order and a 2-day free trial.
                    </p>
                  </div>
                  <Switch
                    checked={(editing.notes ?? "").includes("[FREE 2-DAY TRIAL]") || Number(editing.price_snapshot) === 0}
                    onCheckedChange={async (v) => {
                      await toggleTrial(editing, v);
                      setEditing(null);
                    }}
                  />
                </div>
                <div>
                  <Label>Admin notes</Label>
                  <Textarea
                    defaultValue={editing.admin_notes ?? ""}
                    onBlur={async (e) => {
                      await supabase.from("orders").update({ admin_notes: e.target.value }).eq("id", editing.id);
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New manual order */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add manual order</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase.from("orders").insert({
                customer_name: String(fd.get("customer_name")),
                customer_phone: String(fd.get("customer_phone")),
                service_name_snapshot: String(fd.get("service")),
                price_snapshot: Number(fd.get("price")),
              });
              if (error) return toast.error(error.message);
              toast.success("Order added");
              setShowNew(false);
              load();
            }}
            className="space-y-3"
          >
            <div><Label>Customer name</Label><Input name="customer_name" required /></div>
            <div><Label>Phone</Label><Input name="customer_phone" required /></div>
            <div><Label>Service</Label><Input name="service" required /></div>
            <div><Label>Price (K)</Label><Input name="price" type="number" step="0.01" required /></div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
