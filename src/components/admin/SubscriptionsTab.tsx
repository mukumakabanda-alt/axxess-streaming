import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, MessageSquare, Pencil } from "lucide-react";

type Sub = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export function SubscriptionsTab() {
  const [items, setItems] = useState<Sub[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Sub | null>(null);

  const load = async () => {
    const { data } = await supabase.from("subscriptions").select("*").order("end_date");
    setItems((data ?? []) as Sub[]);
  };
  useEffect(() => { load(); }, []);

  const today = new Date(); today.setHours(0,0,0,0);

  const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - today.getTime()) / 86400000);

  const remove = async (id: string) => {
    if (!confirm("Delete subscription?")) return;
    await supabase.from("subscriptions").delete().eq("id", id);
    load();
  };

  const copyReminder = (s: Sub) => {
    const dl = daysLeft(s.end_date);
    const msg = `Hi ${s.customer_name}! 👋 Friendly reminder from Axxess Streaming — your *${s.service_name}* subscription expires in ${dl} day${dl === 1 ? "" : "s"} (${s.end_date}). Renew today to keep streaming uninterrupted. Reply when ready 🎬🎶`;
    navigator.clipboard.writeText(msg);
    toast.success("Reminder copied");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="font-display text-lg font-bold">Subscriptions</h3>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary"><Plus className="mr-1 h-4 w-4" /> New</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No subscriptions yet</td></tr>}
              {items.map((s) => {
                const dl = daysLeft(s.end_date);
                const expired = dl < 0;
                const soon = !expired && dl <= 7;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-semibold">{s.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{s.customer_phone}</p>
                    </td>
                    <td className="p-3">{s.service_name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{s.start_date} → {s.end_date}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        expired ? "bg-red-500/20 text-red-400" :
                        soon ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>
                        {expired ? "Expired" : soon ? `${dl}d left` : "Active"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <a href={`https://wa.me/${s.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 hover:bg-muted">
                          <MessageSquare className="h-4 w-4" style={{ color: "var(--color-spotify)" }} />
                        </a>
                        <button onClick={() => copyReminder(s)} className="rounded-md p-1.5 hover:bg-muted" title="Copy reminder"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => setEditing(s)} className="rounded-md p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New subscription</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const { error } = await supabase.from("subscriptions").insert({
              customer_name: String(fd.get("customer_name")),
              customer_phone: String(fd.get("customer_phone")),
              service_name: String(fd.get("service_name")),
              start_date: String(fd.get("start_date")),
              end_date: String(fd.get("end_date")),
            });
            if (error) return toast.error(error.message);
            toast.success("Added");
            setShowNew(false); load();
          }} className="space-y-3">
            <div><Label>Customer name</Label><Input name="customer_name" required /></div>
            <div><Label>Phone</Label><Input name="customer_phone" required /></div>
            <div><Label>Service</Label><Input name="service_name" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
              <div><Label>End</Label><Input name="end_date" type="date" required /></div>
            </div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader><DialogTitle>Edit subscription</DialogTitle></DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await supabase.from("subscriptions").update({
                  end_date: String(fd.get("end_date")),
                  is_active: fd.get("is_active") === "on",
                }).eq("id", editing.id);
                toast.success("Updated"); setEditing(null); load();
              }} className="space-y-3">
                <div><Label>End date</Label><Input name="end_date" type="date" defaultValue={editing.end_date} required /></div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={editing.is_active} /> Active
                </label>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
