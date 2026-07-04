import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, MessageSquare, Pencil, Link2, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { normalizePhone } from "@/lib/whatsapp";
import { classifyService } from "@/lib/serviceType";

const SITE_URL = "https://axxess-streaming.lovable.app";

type Sub = {
  id:                 string;
  customer_name:      string;
  customer_phone:     string;
  service_name:       string;
  start_date:         string;
  end_date:           string;
  is_active:          boolean;
  order_id?:          string | null;
  netflix_profile_id?: string | null;
  prime_profile_id?:   string | null;
};

type ProfileLite = {
  id:                string;
  account_id:        string;
  profile_index:     number;
  profile_name:      string;
};

type AccountLite = {
  id:            string;
  account_email: string;
};

export function SubscriptionsTab() {
  const [items,           setItems]           = useState<Sub[]>([]);
  const [netflixProfiles, setNetflixProfiles] = useState<ProfileLite[]>([]);
  const [primeProfiles,   setPrimeProfiles]   = useState<ProfileLite[]>([]);
  const [netflixAccounts, setNetflixAccounts] = useState<AccountLite[]>([]);
  const [primeAccounts,   setPrimeAccounts]   = useState<AccountLite[]>([]);
  const [pushPhones,      setPushPhones]      = useState<Set<string>>(new Set());
  const [remindersById,   setRemindersById]   = useState<Record<string, string[]>>({});
  const [showNew,         setShowNew]         = useState(false);
  const [editing,         setEditing]         = useState<Sub | null>(null);

  const load = async () => {
    const [subsRes, nProfRes, pProfRes, nAccRes, pAccRes] = await Promise.all([
      supabase.from("subscriptions").select("*").order("end_date"),
      supabase.from("netflix_profiles").select("id, account_id, profile_index, profile_name"),
      supabase.from("prime_profiles").select("id, account_id, profile_index, profile_name"),
      supabase.from("netflix_accounts").select("id, account_email"),
      supabase.from("prime_accounts").select("id, account_email"),
    ]);

    const subs = (subsRes.data ?? []) as Sub[];
    setItems(subs);
    setNetflixProfiles((nProfRes.data ?? []) as ProfileLite[]);
    setPrimeProfiles((pProfRes.data ?? []) as ProfileLite[]);
    setNetflixAccounts((nAccRes.data ?? []) as AccountLite[]);
    setPrimeAccounts((pAccRes.data ?? []) as AccountLite[]);

    // Best-effort — these two tables may not exist yet if the automation
    // migration hasn't been run, so failures here shouldn't break the tab.
    try {
      const phones = subs.map((s) => s.customer_phone).filter(Boolean);
      if (phones.length > 0) {
        const { data } = await (supabase as any)
          .from("push_subscribers")
          .select("customer_phone")
          .in("customer_phone", phones);
        setPushPhones(new Set(((data ?? []) as any[]).map((r) => r.customer_phone)));
      } else {
        setPushPhones(new Set());
      }
    } catch {
      setPushPhones(new Set());
    }

    try {
      const ids = subs.map((s) => s.id);
      if (ids.length > 0) {
        const { data } = await (supabase as any)
          .from("notification_log")
          .select("entity_id, reminder_key")
          .eq("entity_type", "subscription")
          .eq("status", "sent")
          .in("entity_id", ids);
        const map: Record<string, string[]> = {};
        for (const row of (data ?? []) as any[]) {
          (map[row.entity_id] ??= []).push(row.reminder_key);
        }
        setRemindersById(map);
      } else {
        setRemindersById({});
      }
    } catch {
      setRemindersById({});
    }
  };
  useEffect(() => { load(); }, []);

  const netflixAccById = useMemo(
    () => Object.fromEntries(netflixAccounts.map((a) => [a.id, a])),
    [netflixAccounts],
  );
  const primeAccById = useMemo(
    () => Object.fromEntries(primeAccounts.map((a) => [a.id, a])),
    [primeAccounts],
  );
  const netflixProfById = useMemo(
    () => Object.fromEntries(netflixProfiles.map((p) => [p.id, p])),
    [netflixProfiles],
  );
  const primeProfById = useMemo(
    () => Object.fromEntries(primeProfiles.map((p) => [p.id, p])),
    [primeProfiles],
  );

  // Connects this row back to the actual Netflix/Prime tab account+profile,
  // so Stan doesn't have to cross-reference two tabs by eye anymore.
  const linkedAccountLabel = (s: Sub): { text: string; muted: boolean } => {
    const parts: string[] = [];
    if (s.netflix_profile_id) {
      const p = netflixProfById[s.netflix_profile_id];
      const acc = p ? netflixAccById[p.account_id] : undefined;
      if (p) parts.push(`Netflix P${p.profile_index}${acc ? ` · ${acc.account_email}` : ""}`);
    }
    if (s.prime_profile_id) {
      const p = primeProfById[s.prime_profile_id];
      const acc = p ? primeAccById[p.account_id] : undefined;
      if (p) parts.push(`Prime P${p.profile_index}${acc ? ` · ${acc.account_email}` : ""}`);
    }
    if (parts.length > 0) return { text: parts.join(" + "), muted: false };

    const type = classifyService(s.service_name);
    if (type === "other") return { text: "—", muted: true };
    return { text: "Not linked — pick a profile on next renewal", muted: true };
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = (end: string) =>
    Math.ceil((new Date(end).getTime() - today.getTime()) / 86400000);

  const remove = async (id: string) => {
    if (!confirm("Delete subscription?")) return;
    await supabase.from("subscriptions").delete().eq("id", id);
    load();
  };

  // Copies a WhatsApp-ready reminder message to clipboard
  const copyReminder = (s: Sub) => {
    const dl  = daysLeft(s.end_date);
    const msg = `Hi ${s.customer_name}! 👋 Friendly reminder from Axxess Streaming — your *${s.service_name}* subscription expires in ${dl} day${dl === 1 ? "" : "s"} (${s.end_date}). Renew today to keep streaming uninterrupted. Reply when ready 🎬`;
    navigator.clipboard.writeText(msg);
    toast.success("Reminder copied");
  };

  // Copies a WhatsApp message with the /renew deep-link pre-filled for
  // this customer's phone number — they tap the link and land straight
  // on their subscription details without typing anything
  const copyRenewLink = (s: Sub) => {
    const dl      = daysLeft(s.end_date);
    const phone   = s.customer_phone.replace(/\D/g, "");
    const link    = `${SITE_URL}/renew?phone=${phone}`;
    const urgency = dl < 0
      ? "Your subscription has expired"
      : dl <= 3
      ? `Your subscription expires in ${dl} day${dl === 1 ? "" : "s"}`
      : `Your *${s.service_name}* subscription expires on ${s.end_date}`;

    const msg =
      `Hi ${s.customer_name}! 👋\n\n` +
      `${urgency}. Renew in under 60 seconds — no need to message us:\n\n` +
      `👉 ${link}\n\n` +
      `Your details are already saved. Just tap, pick your duration, and pay. 🎬`;

    navigator.clipboard.writeText(msg);
    toast.success("Renewal link message copied — paste it in WhatsApp");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="font-display text-lg font-bold">Subscriptions</h3>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary">
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-left">Linked account</th>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Notify</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No subscriptions yet
                  </td>
                </tr>
              )}
              {items.map((s) => {
                const dl      = daysLeft(s.end_date);
                const expired = dl < 0;
                const soon    = !expired && dl <= 7;
                const linked  = linkedAccountLabel(s);
                const optedIn = pushPhones.has(s.customer_phone);
                const sentKeys = remindersById[s.id] ?? [];
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-semibold">{s.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{s.customer_phone}</p>
                    </td>
                    <td className="p-3">{s.service_name}</td>
                    <td className={`p-3 text-xs ${linked.muted ? "text-muted-foreground" : ""}`}>
                      {linked.text}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.start_date} → {s.end_date}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        expired ? "bg-red-500/20 text-red-400" :
                        soon    ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-green-500/20 text-green-400"
                      }`}>
                        {expired ? "Expired" : soon ? `${dl}d left` : "Active"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5" title={
                        optedIn
                          ? "Reachable by push notification"
                          : "Not opted into push — WhatsApp is the only way to reach them"
                      }>
                        {optedIn
                          ? <Bell className="h-3.5 w-3.5 text-primary" />
                          : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        {sentKeys.length > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[10px] text-green-400"
                            title={`Renewal push already sent: ${sentKeys.join(", ")}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> sent
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {/* Open WhatsApp chat for this customer */}
                        <a
                          href={`https://wa.me/${s.customer_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-1.5 hover:bg-muted"
                          title="Open WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" style={{ color: "#25D366" }} />
                        </a>
                        {/* Copy standard reminder text */}
                        <button
                          onClick={() => copyReminder(s)}
                          className="rounded-md p-1.5 hover:bg-muted"
                          title={sentKeys.length > 0
                            ? "Heads up: a push reminder already went out — copying anyway"
                            : "Copy reminder message"}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {/* Copy renewal link message — the new self-serve action */}
                        <button
                          onClick={() => copyRenewLink(s)}
                          className="rounded-md p-1.5 hover:bg-muted"
                          title="Copy renewal link for WhatsApp"
                        >
                          <Link2 className="h-4 w-4 text-primary" />
                        </button>
                        <button
                          onClick={() => setEditing(s)}
                          className="rounded-md p-1.5 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="rounded-md p-1.5 text-destructive hover:bg-muted"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        🔔 = opted into push · "sent" = a renewal reminder already went out automatically — no need to duplicate it over WhatsApp.
        "Linked account" connects straight to the profile on the Netflix/Prime Video tab; expired subscriptions free their profile automatically overnight.
      </p>

      {/* New subscription dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New subscription</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase.from("subscriptions").insert({
                customer_name:  String(fd.get("customer_name")),
                customer_phone: normalizePhone(String(fd.get("customer_phone"))),
                service_name:   String(fd.get("service_name")),
                start_date:     String(fd.get("start_date")),
                end_date:       String(fd.get("end_date")),
              });
              if (error) return toast.error(error.message);
              toast.success("Added");
              setShowNew(false);
              load();
            }}
            className="space-y-3"
          >
            <div><Label>Customer name</Label><Input name="customer_name" required /></div>
            <div><Label>Phone</Label><Input name="customer_phone" required /></div>
            <div><Label>Service</Label><Input name="service_name" required /></div>
            <p className="text-xs text-muted-foreground">
              Manually-added subscriptions aren't linked to a Netflix/Prime profile automatically —
              assign one from the Netflix or Prime Video tab if this customer needs one.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div><Label>End</Label><Input name="end_date" type="date" required /></div>
            </div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader><DialogTitle>Edit subscription</DialogTitle></DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await supabase.from("subscriptions").update({
                    end_date:  String(fd.get("end_date")),
                    is_active: fd.get("is_active") === "on",
                  }).eq("id", editing.id);
                  toast.success("Updated");
                  setEditing(null);
                  load();
                }}
                className="space-y-3"
              >
                <div className="text-xs text-muted-foreground">
                  {linkedAccountLabel(editing).text}
                </div>
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
