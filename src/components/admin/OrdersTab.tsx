import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Copy, Trash2, Pencil, MessageSquare, Plus } from "lucide-react";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";
import { recordRewardUnlocks } from "@/lib/rewards";
import { normalizePhone } from "@/lib/whatsapp";
import {
  classifyService, needsNetflixProfile, needsPrimeProfile, serviceTypeLabel,
  type ServiceType,
} from "@/lib/serviceType";

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
  netflix_profile_id?: string | null;
  prime_profile_id?: string | null;
};

type ProfileRow = {
  id: string;
  account_id: string;
  profile_name: string;
  status: string;
  is_vulnerable: boolean;
};

type AccountRow = { id: string; account_email: string };

type PendingAssign = {
  order: Order;
  targetStatus: "approved" | "completed";
  serviceType: ServiceType;
  needNetflix: boolean;
  needPrime: boolean;
  netflixProfileId: string | null;
  primeProfileId: string | null;
  existing: any | null; // an active subscription row this order will extend, if any
};

const STATUSES = ["pending", "approved", "completed", "rejected"] as const;

// A row of selectable/vulnerable profile buttons, shared between the
// Netflix and Prime Video sections of the assign-profile dialog below.
function ProfilePickerList({
  title, options, selected, onSelect, onVulnerableClick,
}: {
  title: string;
  options: (ProfileRow & { accountEmail: string })[];
  selected: string | null;
  onSelect: (id: string) => void;
  onVulnerableClick: (label: string) => void;
}) {
  const available  = options.filter((p) => p.status === "available" && !p.is_vulnerable);
  const vulnerable = options.filter((p) => p.is_vulnerable);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      {available.length === 0 && (
        <p className="text-xs text-destructive">
          {vulnerable.length > 0
            ? "All full — every profile is either in use or vulnerable."
            : "No profiles found — add an account on this tab first."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {available.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              selected === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {p.profile_name} · {p.accountEmail}
          </button>
        ))}
        {vulnerable.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onVulnerableClick(`${p.profile_name} (${p.accountEmail})`)}
            className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-400"
            title="Vulnerable — change its PIN first"
          >
            ⚠ {p.profile_name} · {p.accountEmail}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OrdersTab() {
  const [items, setItems] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [serviceF, setServiceF] = useState<string>("all");
  const [editing, setEditing] = useState<Order | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [pointsByPhone, setPointsByPhone] = useState<Record<string, number>>({});

  const [netflixProfiles, setNetflixProfiles] = useState<ProfileRow[]>([]);
  const [primeProfiles,   setPrimeProfiles]   = useState<ProfileRow[]>([]);
  const [netflixAccounts, setNetflixAccounts] = useState<AccountRow[]>([]);
  const [primeAccounts,   setPrimeAccounts]   = useState<AccountRow[]>([]);
  const [assignDialog,    setAssignDialog]    = useState<PendingAssign | null>(null);

  // Controlled fields for the "Add manual order" dialog, so we can look the
  // phone up against existing customers and auto-fill their name instead of
  // risking a duplicate customer record with a slightly different spelling.
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [existingNote, setExistingNote] = useState<string | null>(null);

  const load = async () => {
    const [ordersRes, nProfRes, pProfRes, nAccRes, pAccRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("netflix_profiles").select("*"),
      supabase.from("prime_profiles").select("*"),
      supabase.from("netflix_accounts").select("id, account_email"),
      supabase.from("prime_accounts").select("id, account_email"),
    ]);

    const data = ordersRes.data;
    setItems((data ?? []) as Order[]);
    const uniq = Array.from(new Set((data ?? []).map((d: any) => d.service_name_snapshot)));
    setServices(uniq);
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

    setNetflixProfiles((nProfRes.data ?? []) as ProfileRow[]);
    setPrimeProfiles((pProfRes.data ?? []) as ProfileRow[]);
    setNetflixAccounts((nAccRes.data ?? []) as AccountRow[]);
    setPrimeAccounts((pAccRes.data ?? []) as AccountRow[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((o) => {
    const m = q.toLowerCase();
    const matchQ = !q || o.customer_name.toLowerCase().includes(m) || o.customer_phone.includes(m);
    const matchS = statusF === "all" || o.status === statusF;
    const matchSv = serviceF === "all" || o.service_name_snapshot === serviceF;
    return matchQ && matchS && matchSv;
  }), [items, q, statusF, serviceF]);

  // Live inventory counts, so Stan can see at a glance — right on the
  // Orders tab — whether Netflix/Prime is full before he even opens the
  // assign dialog on a specific order.
  const netflixAvailable  = netflixProfiles.filter((p) => p.status === "available" && !p.is_vulnerable).length;
  const netflixVulnerable = netflixProfiles.filter((p) => p.is_vulnerable).length;
  const primeAvailable    = primeProfiles.filter((p) => p.status === "available" && !p.is_vulnerable).length;
  const primeVulnerable   = primeProfiles.filter((p) => p.is_vulnerable).length;

  const netflixOptions = useMemo(
    () => netflixProfiles.map((p) => ({
      ...p,
      accountEmail: netflixAccounts.find((a) => a.id === p.account_id)?.account_email ?? "—",
    })),
    [netflixProfiles, netflixAccounts],
  );
  const primeOptions = useMemo(
    () => primeProfiles.map((p) => ({
      ...p,
      accountEmail: primeAccounts.find((a) => a.id === p.account_id)?.account_email ?? "—",
    })),
    [primeProfiles, primeAccounts],
  );

  // ── Subscription helpers ──────────────────────────────────────────────────

  const createFreshSubscription = async (
    o: Order, netflixProfileId: string | null, primeProfileId: string | null,
  ) => {
    const days  = o.duration_days ?? 30;
    const start = new Date();
    const end   = new Date(); end.setDate(end.getDate() + days);
    await (supabase as any).from("subscriptions").insert({
      order_id:            o.id,
      customer_name:       o.customer_name,
      customer_phone:      o.customer_phone,
      service_name:        o.service_name_snapshot,
      start_date:          start.toISOString().slice(0, 10),
      end_date:            end.toISOString().slice(0, 10),
      is_active:           true,
      netflix_profile_id:  netflixProfileId,
      prime_profile_id:    primeProfileId,
    });
    toast.success(`Subscription created (${days} days)`);
  };

  // Renewal — same customer, same service. Days stack on top of whatever
  // is left rather than resetting, so renewing a few days early never
  // costs the customer anything.
  const extendSubscription = async (
    existing: any, o: Order,
    netflixProfileId?: string | null, primeProfileId?: string | null,
  ) => {
    const days  = o.duration_days ?? 30;
    const now0  = new Date();
    const base  = new Date(`${existing.end_date}T00:00:00`);
    const start = base > now0 ? base : now0;
    const end   = new Date(start); end.setDate(end.getDate() + days);

    const patch: Record<string, unknown> = {
      end_date:      end.toISOString().slice(0, 10),
      is_active:     true,
      order_id:      o.id,
      customer_name: o.customer_name,
    };
    if (netflixProfileId) patch.netflix_profile_id = netflixProfileId;
    if (primeProfileId)   patch.prime_profile_id   = primeProfileId;

    await (supabase as any).from("subscriptions").update(patch).eq("id", existing.id);
    toast.success(`Renewed — extended to ${patch.end_date}`);
  };

  const awardCompletionPoints = async (o: Order) => {
    if (Number(o.price_snapshot) > 0) {
      const { data: prev } = await supabase
        .from("customer_points")
        .select("points")
        .eq("customer_phone", o.customer_phone)
        .maybeSingle();
      const prevPoints = prev?.points ?? 0;
      const { data: newTotal } = await supabase.rpc("award_points", {
        _phone:  o.customer_phone,
        _name:   o.customer_name,
        _delta:  5,
        _reason: `Subscribed to ${o.service_name_snapshot}`,
      });
      const newPoints = (newTotal as number) ?? prevPoints + 5;
      await recordRewardUnlocks(o.customer_phone, o.customer_name, prevPoints, newPoints);

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
            _phone:  ref.owner_phone,
            _name:   ref.owner_name,
            _delta:  10,
            _reason: `Friend used referral code ${o.referral_code}`,
          });
          await recordRewardUnlocks(ref.owner_phone, ref.owner_name, refPrevPts, (refNew as number) ?? refPrevPts + 10);
          await supabase.from("referrals")
            .update({ uses_count: (ref.uses_count ?? 0) + 1 })
            .eq("code", o.referral_code);
        }
      }
    }
  };

  const finalizeOrderStatus = async (
    o: Order, status: Order["status"],
    netflixProfileId?: string | null, primeProfileId?: string | null,
  ) => {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (netflixProfileId) patch.netflix_profile_id = netflixProfileId;
    if (primeProfileId)   patch.prime_profile_id   = primeProfileId;

    const { error } = await (supabase as any).from("orders").update(patch).eq("id", o.id);
    if (error) return toast.error(error.message);
    if (status === "completed") await awardCompletionPoints(o);
    toast.success(`Marked ${status}`);
    load();
  };

  // ── Status change — the heart of the "cohesive" logic ────────────────────
  const updateStatus = async (id: string, status: Order["status"]) => {
    const o = items.find((x) => x.id === id);
    if (!o) return;

    // Statuses that don't fulfil anything (pending / rejected) — just relabel.
    if (status !== "approved" && status !== "completed") {
      const { error } = await supabase
        .from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success(`Marked ${status}`);
      load();
      return;
    }

    // Already fulfilled once before (e.g. approved → completed on the same
    // order) — don't reassign a profile a second time, just relabel.
    const { data: alreadyLinked } = await supabase
      .from("subscriptions").select("id").eq("order_id", id).maybeSingle();
    if (alreadyLinked) {
      await finalizeOrderStatus(o, status);
      return;
    }

    const serviceType = classifyService(o.service_name_snapshot);

    // Not a Netflix/Prime/All Access order (e.g. a one-off add-on) — no
    // profile to assign, keep the old direct behaviour.
    if (serviceType === "other") {
      await createFreshSubscription(o, null, null);
      await finalizeOrderStatus(o, status);
      return;
    }

    // Is this the same customer renewing? Look up any currently-active
    // subscription of the same type for this phone number.
    const { data: activeSubsRaw } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("customer_phone", o.customer_phone)
      .eq("is_active", true);
    const existing = ((activeSubsRaw ?? []) as any[])
      .find((s) => classifyService(s.service_name) === serviceType) ?? null;

    const needNetflix = needsNetflixProfile(serviceType) && !existing?.netflix_profile_id;
    const needPrime   = needsPrimeProfile(serviceType) && !existing?.prime_profile_id;

    if (!needNetflix && !needPrime) {
      // Fully-linked renewal — same profile carries over, no picking needed.
      await extendSubscription(existing, o);
      await finalizeOrderStatus(o, status);
      return;
    }

    // Brand new customer/service, or a legacy subscription missing its
    // profile link — ask which profile(s) to assign before we proceed.
    setAssignDialog({
      order: o,
      targetStatus: status,
      serviceType,
      needNetflix,
      needPrime,
      netflixProfileId: null,
      primeProfileId: null,
      existing,
    });
  };

  const clickVulnerable = (label: string, kind: "Netflix" | "Prime Video") => {
    toast.error(`${label} is vulnerable — change its PIN on the ${kind} tab first, then come back and assign it here.`);
  };

  const confirmAssign = async () => {
    if (!assignDialog) return;
    const { order: o, targetStatus, needNetflix, needPrime, netflixProfileId, primeProfileId, existing } = assignDialog;

    if (needNetflix && !netflixProfileId) return toast.error("Pick a Netflix profile first");
    if (needPrime && !primeProfileId)     return toast.error("Pick a Prime Video profile first");

    if (netflixProfileId) {
      await supabase.from("netflix_profiles")
        .update({ status: "active", assigned_customer: o.customer_name })
        .eq("id", netflixProfileId);
    }
    if (primeProfileId) {
      await supabase.from("prime_profiles")
        .update({ status: "active", assigned_customer: o.customer_name })
        .eq("id", primeProfileId);
    }

    if (existing) {
      await extendSubscription(existing, o, netflixProfileId, primeProfileId);
    } else {
      await createFreshSubscription(o, netflixProfileId, primeProfileId);
    }

    setAssignDialog(null);
    await finalizeOrderStatus(o, targetStatus, netflixProfileId, primeProfileId);
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
    const msg = `Hi ${o.customer_name}! 👋 This is Axxess Streaming. Your *${o.service_name_snapshot}* subscription is up for renewal. Renew today for just K${Number(o.price_snapshot)} and continue uninterrupted streaming. Reply here when you're ready 🎬`;
    navigator.clipboard.writeText(msg);
    toast.success("Reminder copied to clipboard");
  };

  // Looks an existing customer up by phone so re-typing their name never
  // creates a second, slightly-different record for the same person.
  const lookupExisting = async (phoneRaw: string) => {
    const phone = normalizePhone(phoneRaw);
    if (!phone) { setExistingNote(null); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("customer_name")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.customer_name) {
      setNewName(data.customer_name);
      setExistingNote(`Existing customer — this will renew ${data.customer_name}'s subscription, not create a new one.`);
    } else {
      setExistingNote(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-3 py-1">
          Netflix: <b className="text-green-400">{netflixAvailable}</b> available
          {netflixVulnerable > 0 && <span className="text-orange-400"> · {netflixVulnerable} vulnerable</span>}
        </span>
        <span className="rounded-full bg-muted px-3 py-1">
          Prime Video: <b className="text-green-400">{primeAvailable}</b> available
          {primeVulnerable > 0 && <span className="text-orange-400"> · {primeVulnerable} vulnerable</span>}
        </span>
        <span className="text-muted-foreground">Orders older than 90 days are cleaned up automatically.</span>
      </div>

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
        <Button
          onClick={() => { setNewName(""); setNewPhone(""); setExistingNote(null); setShowNew(true); }}
          className="rounded-full bg-primary"
        >
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
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
                      <a
                        href={`https://wa.me/${o.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${o.customer_name}! 👋 Your *${o.service_name_snapshot}* access is ready. Here are your login details:\n\nEmail: \nPassword: \n\nEnjoy streaming! 🎬 — Axxess Entertainment`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1.5 hover:bg-muted"
                        title="Send login details"
                      >
                        <MessageSquare className="h-4 w-4" style={{ color: "#25D366" }} />
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

      {/* Assign a Netflix/Prime profile before an order can complete */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent>
          {assignDialog && (
            <>
              <DialogHeader>
                <DialogTitle>Assign a profile — {assignDialog.order.customer_name}</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                {serviceTypeLabel(assignDialog.serviceType)} order — pick{" "}
                {assignDialog.needNetflix && assignDialog.needPrime
                  ? "a Netflix and a Prime Video profile"
                  : assignDialog.needNetflix ? "a Netflix profile" : "a Prime Video profile"}{" "}
                before this order can be marked {assignDialog.targetStatus}.
              </p>
              <div className="space-y-4">
                {assignDialog.needNetflix && (
                  <ProfilePickerList
                    title="Netflix profile"
                    options={netflixOptions}
                    selected={assignDialog.netflixProfileId}
                    onSelect={(id) => setAssignDialog({ ...assignDialog, netflixProfileId: id })}
                    onVulnerableClick={(label) => clickVulnerable(label, "Netflix")}
                  />
                )}
                {assignDialog.needPrime && (
                  <ProfilePickerList
                    title="Prime Video profile"
                    options={primeOptions}
                    selected={assignDialog.primeProfileId}
                    onSelect={(id) => setAssignDialog({ ...assignDialog, primeProfileId: id })}
                    onVulnerableClick={(label) => clickVulnerable(label, "Prime Video")}
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
                <Button onClick={confirmAssign}>Confirm &amp; mark {assignDialog.targetStatus}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                customer_name:         String(fd.get("customer_name")),
                customer_phone:        normalizePhone(String(fd.get("customer_phone"))),
                service_name_snapshot: String(fd.get("service")),
                price_snapshot:        Number(fd.get("price")),
              });
              if (error) return toast.error(error.message);
              toast.success("Order added");
              setShowNew(false);
              load();
            }}
            className="space-y-3"
          >
            <div>
              <Label>Customer name</Label>
              <Input name="customer_name" required value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                name="customer_phone"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onBlur={(e) => lookupExisting(e.target.value)}
              />
              {existingNote && <p className="mt-1 text-xs text-primary">{existingNote}</p>}
            </div>
            <div><Label>Service</Label><Input name="service" required /></div>
            <div><Label>Price (K)</Label><Input name="price" type="number" step="0.01" required /></div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
                                    }
