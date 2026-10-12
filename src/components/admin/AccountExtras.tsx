import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BellRing, CalendarClock } from "lucide-react";

export type EditableAccount = {
  id: string;
  account_email: string;
  account_password: string;
  status: string;
  notes: string | null;
  renewal_date?: string | null;
};

const REMIND_DAYS = 7;

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function RenewalChip({ date }: { date?: string | null }) {
  const d = daysUntil(date);
  if (d === null) return <span className="text-[11px] text-muted-foreground">No renewal date set</span>;
  const urgent = d <= REMIND_DAYS;
  const text = d < 0 ? `Renewal overdue by ${-d}d` : d === 0 ? "Renews today" : `Renews in ${d}d`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${urgent ? "text-orange-400" : "text-muted-foreground"}`}>
      <CalendarClock className="h-3 w-3" /> {text} · {date}
    </span>
  );
}

export function RenewalReminders({ accounts, platform }: { accounts: EditableAccount[]; platform: string }) {
  const due = accounts
    .map(a => ({ a, d: daysUntil(a.renewal_date) }))
    .filter((x): x is { a: EditableAccount; d: number } => x.d !== null && x.d <= REMIND_DAYS)
    .sort((x, y) => x.d - y.d);
  if (due.length === 0) return null;
  return (
    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-orange-400">
        <BellRing className="h-4 w-4" /> {due.length} {platform} {due.length === 1 ? "account needs" : "accounts need"} renewing soon
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {due.map(({ a, d }) => (
          <li key={a.id} className="flex justify-between gap-2">
            <span className="truncate font-mono">{a.account_email}</span>
            <span className="shrink-0 font-semibold text-orange-400">
              {d < 0 ? `overdue ${-d}d` : d === 0 ? "today" : `in ${d}d`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditAccountDialog({
  account, table, onClose, onSaved,
}: {
  account: EditableAccount | null;
  table: "netflix_accounts" | "prime_accounts";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditableAccount | null>(account);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(account), [account]);

  const save = async () => {
    if (!form) return;
    if (!form.account_email.trim() || !form.account_password.trim()) return toast.error("Email and password required");
    setSaving(true);
    const { error } = await supabase.from(table).update({
      account_email: form.account_email.trim(),
      account_password: form.account_password.trim(),
      status: form.status,
      notes: form.notes?.trim() || null,
      renewal_date: form.renewal_date || null,
    }).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Account updated");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!account} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit account</DialogTitle></DialogHeader>
        {form && (
          <div className="space-y-3">
            <div><Label>Email / Username</Label>
              <Input value={form.account_email} onChange={e => setForm({ ...form, account_email: e.target.value })} /></div>
            <div><Label>Password</Label>
              <Input value={form.account_password} onChange={e => setForm({ ...form, account_password: e.target.value })} /></div>
            <div><Label>Subscription renewal date</Label>
              <Input type="date" value={form.renewal_date ?? ""} onChange={e => setForm({ ...form, renewal_date: e.target.value || null })} />
              <p className="mt-1 text-xs text-muted-foreground">You'll see a reminder {REMIND_DAYS} days before this date.</p></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label>Notes</Label>
              <Input value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
