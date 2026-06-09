import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Eye, EyeOff, Search } from "lucide-react";

type Account = {
  id: string;
  service_name: string;
  account_email: string;
  account_password: string;
  profile_slot: string | null;
  status: string;
  assigned_customer_name: string | null;
  assigned_customer_phone: string | null;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["available", "assigned", "expired", "issue"] as const;
const SERVICES = ["Netflix", "Prime Video", "All-Access", "Other"];

const empty = (): Partial<Account> => ({
  service_name: "Netflix",
  account_email: "",
  account_password: "",
  profile_slot: "",
  status: "available",
  assigned_customer_name: "",
  assigned_customer_phone: "",
  notes: "",
});

export function AccountInventoryTab() {
  const [items, setItems] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("account_inventory")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Account[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.service_name || !editing.account_email || !editing.account_password) {
      return toast.error("Service, email, and password are required");
    }
    const payload = {
      service_name: editing.service_name,
      account_email: editing.account_email,
      account_password: editing.account_password,
      profile_slot: editing.profile_slot || null,
      status: editing.status || "available",
      assigned_customer_name: editing.assigned_customer_name || null,
      assigned_customer_phone: editing.assigned_customer_phone || null,
      notes: editing.notes || null,
    };
    const { error } = editing.id
      ? await supabase.from("account_inventory").update(payload).eq("id", editing.id)
      : await supabase.from("account_inventory").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Account updated" : "Account added");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this account from inventory?")) return;
    await supabase.from("account_inventory").delete().eq("id", id);
    load();
  };

  const filtered = items.filter((a) => {
    const m = q.toLowerCase().trim();
    if (!m) return true;
    return (
      a.service_name.toLowerCase().includes(m) ||
      a.account_email.toLowerCase().includes(m) ||
      (a.assigned_customer_name?.toLowerCase().includes(m) ?? false) ||
      (a.assigned_customer_phone?.includes(m) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Account Inventory</h3>
          <p className="text-xs text-muted-foreground">
            Streaming credentials you've purchased — ready to assign to customers.
          </p>
        </div>
        <Button onClick={() => setEditing(empty())} className="rounded-full bg-primary">
          <Plus className="h-4 w-4 mr-1" /> Add account
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by service, email, or customer…" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-left">Credentials</th>
                <th className="p-3 text-left">Profile</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Assigned to</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No accounts in inventory</td></tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{a.service_name}</td>
                  <td className="p-3 font-mono text-xs">
                    <p>{a.account_email}</p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      {showPwd[a.id] ? a.account_password : "••••••••"}
                      <button onClick={() => setShowPwd((p) => ({ ...p, [a.id]: !p[a.id] }))}>
                        {showPwd[a.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </p>
                  </td>
                  <td className="p-3 text-xs">{a.profile_slot ?? "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      a.status === "available" ? "bg-green-500/20 text-green-400" :
                      a.status === "assigned" ? "bg-blue-500/20 text-blue-400" :
                      a.status === "expired" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{a.status}</span>
                  </td>
                  <td className="p-3 text-xs">
                    {a.assigned_customer_name ? (
                      <>
                        <p>{a.assigned_customer_name}</p>
                        <p className="text-muted-foreground">{a.assigned_customer_phone}</p>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(a)} className="rounded-md p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit account" : "Add account"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Service</Label>
                <Select
                  value={editing.service_name}
                  onValueChange={(v) => setEditing({ ...editing, service_name: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email / Username</Label>
                <Input value={editing.account_email ?? ""} onChange={(e) => setEditing({ ...editing, account_email: e.target.value })} />
              </div>
              <div>
                <Label>Password</Label>
                <Input value={editing.account_password ?? ""} onChange={(e) => setEditing({ ...editing, account_password: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Profile slot</Label>
                  <Input
                    placeholder="e.g. Profile 1"
                    value={editing.profile_slot ?? ""}
                    onChange={(e) => setEditing({ ...editing, profile_slot: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.status ?? "available"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Assigned to (name)</Label>
                  <Input value={editing.assigned_customer_name ?? ""} onChange={(e) => setEditing({ ...editing, assigned_customer_name: e.target.value })} />
                </div>
                <div>
                  <Label>Assigned to (phone)</Label>
                  <Input value={editing.assigned_customer_phone ?? ""} onChange={(e) => setEditing({ ...editing, assigned_customer_phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} className="bg-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  }
