// src/components/admin/PrimeVideoAccountsTab.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, Eye, EyeOff, AlertTriangle, ShieldCheck,
  RotateCcw, ChevronLeft, KeyRound,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type TrialAccount = {
  id:                string;
  service:           "prime";
  account_email:     string;
  account_password:  string;
  profile_name:      string | null;
  pin:               string | null;
  default_pin:       string | null;
  status:            "available" | "assigned" | "expired";
  is_vulnerable:     boolean;
  assigned_to_name:  string | null;
  assigned_to_phone: string | null;
  assigned_at:       string | null;
  expires_at:        string | null;
  created_at:        string;
};

const EMPTY_ACCOUNT = (): Partial<TrialAccount> => ({
  service:          "prime",
  account_email:    "",
  account_password: "",
  profile_name:     "",
  pin:              "",
  default_pin:      "",
  status:           "available",
  is_vulnerable:    false,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ a }: { a: TrialAccount }) {
  if (a.is_vulnerable) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
        <AlertTriangle className="h-2.5 w-2.5" /> Vulnerable
      </span>
    );
  }
  const map: Record<string, string> = {
    available: "bg-green-500/20 text-green-400",
    assigned:  "bg-blue-500/20 text-blue-400",
    expired:   "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[a.status] ?? "bg-muted text-muted-foreground"}`}>
      {a.status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PrimeVideoAccountsTab() {
  const [accounts, setAccounts]     = useState<TrialAccount[]>([]);
  const [adding,   setAdding]       = useState(false);
  const [newAcc,   setNewAcc]       = useState<Partial<TrialAccount>>(EMPTY_ACCOUNT());
  const [editing,  setEditing]      = useState<TrialAccount | null>(null);
  const [showPwd,  setShowPwd]      = useState<Record<string, boolean>>({});
  const [pinModal, setPinModal]     = useState<TrialAccount | null>(null);
  const [newPin,   setNewPin]       = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("trial_accounts")
      .select("*")
      .eq("service", "prime")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setAccounts((data ?? []) as TrialAccount[]);
  };

  useEffect(() => { load(); }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      accounts.length,
    available:  accounts.filter(a => a.status === "available" && !a.is_vulnerable).length,
    assigned:   accounts.filter(a => a.status === "assigned").length,
    vulnerable: accounts.filter(a => a.is_vulnerable).length,
    expired:    accounts.filter(a => a.status === "expired").length,
  }), [accounts]);

  // ── Add new account ───────────────────────────────────────────────────────

  const addAccount = async () => {
    if (!newAcc.account_email || !newAcc.account_password) {
      return toast.error("Email and password are required.");
    }
    const { error } = await supabase.from("trial_accounts").insert({
      service:          "prime",
      account_email:    newAcc.account_email!.trim(),
      account_password: newAcc.account_password!.trim(),
      profile_name:     newAcc.profile_name?.trim() || null,
      pin:              newAcc.pin?.trim() || null,
      default_pin:      newAcc.pin?.trim() || null, // store original as default
      status:           "available",
      is_vulnerable:    false,
    });
    if (error) return toast.error(error.message);
    toast.success("Prime Video account added.");
    setNewAcc(EMPTY_ACCOUNT());
    setAdding(false);
    load();
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteAccount = async (id: string) => {
    if (!confirm("Delete this Prime Video account permanently?")) return;
    const { error } = await supabase.from("trial_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted.");
    load();
  };

  // ── Save edit ─────────────────────────────────────────────────────────────

  const saveEdit = async () => {
    if (!editing) return;

    // BLOCK: cannot manually set status to available if vulnerable
    if (editing.is_vulnerable && editing.status === "available") {
      toast.error("Change the PIN first before making this account available.");
      return;
    }

    const { error } = await supabase.from("trial_accounts").update({
      account_email:    editing.account_email,
      account_password: editing.account_password,
      profile_name:     editing.profile_name || null,
      status:           editing.status,
      assigned_to_name: editing.assigned_to_name || null,
      assigned_to_phone:editing.assigned_to_phone || null,
    }).eq("id", editing.id);

    if (error) return toast.error(error.message);
    toast.success("Account updated.");
    setEditing(null);
    load();
  };

  // ── Reset (expire → marks vulnerable) ────────────────────────────────────

  const resetAccount = async (a: TrialAccount) => {
    if (!confirm("Mark this account as expired and flag it as vulnerable?")) return;
    const { error } = await supabase.from("trial_accounts").update({
      status:           "expired",
      is_vulnerable:    true,
      assigned_to_name: null,
      assigned_to_phone:null,
      assigned_at:      null,
      expires_at:       null,
    }).eq("id", a.id);
    if (error) return toast.error(error.message);

    // Log vulnerable alert
    await supabase.from("notification_log").insert({
      type:  "vulnerable_alert",
      title: `⚠️ VULNERABLE: Prime Video`,
      body:  `${a.account_email} is now VULNERABLE. Change the PIN before reassigning.`,
      meta:  { account_id: a.id, service: "prime" },
    }).throwOnError().catch(() => {});

    toast.warning(`${a.account_email} flagged as VULNERABLE. Change the PIN before reusing.`);
    load();
  };

  // ── PIN change → clears vulnerable ───────────────────────────────────────

  const confirmPinChange = async () => {
    if (!pinModal) return;
    if (!newPin || newPin.length < 4) {
      return toast.error("Enter the new 4-digit PIN you set on Prime Video.");
    }
    const { error } = await supabase.from("trial_accounts").update({
      pin:           newPin,
      default_pin:   newPin,   // update reference so future comparison works
      is_vulnerable: false,
      status:        "available",
    }).eq("id", pinModal.id);
    if (error) return toast.error(error.message);
    toast.success("PIN updated. Vulnerability cleared. Account is now available.");
    setPinModal(null);
    setNewPin("");
    load();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total",      v: stats.total,      color: "text-white" },
          { label: "Available",  v: stats.available,  color: "text-green-400" },
          { label: "Assigned",   v: stats.assigned,   color: "text-blue-400" },
          { label: "Vulnerable", v: stats.vulnerable, color: "text-orange-400" },
          { label: "Expired",    v: stats.expired,    color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border gradient-card p-4">
            <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Vulnerable banner */}
      {stats.vulnerable > 0 && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
          <div>
            <p className="text-sm font-bold text-orange-400">
              {stats.vulnerable} vulnerable {stats.vulnerable === 1 ? "account" : "accounts"} detected
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              These accounts have unchanged PINs from previous assignments. Change the PIN on Prime Video, then confirm it below to clear the vulnerability and make the account available again.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Prime Video Trial Accounts</h3>
          <p className="text-xs text-muted-foreground">
            Accounts used for 2-day free trials. Vulnerable accounts cannot be assigned.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="rounded-full bg-primary">
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Prime Video accounts yet. Add one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(a => (
            <div
              key={a.id}
              className="relative flex flex-col rounded-2xl border border-border gradient-card p-4"
              style={a.is_vulnerable ? { borderColor: "rgba(249,115,22,0.4)" } : {}}
            >
              {/* Status badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="truncate font-mono text-sm font-semibold">{a.account_email}</p>
                <StatusBadge a={a} />
              </div>

              {/* Password */}
              <p className="mb-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                {showPwd[a.id] ? a.account_password : "••••••••"}
                <button onClick={() => setShowPwd(s => ({ ...s, [a.id]: !s[a.id] }))}>
                  {showPwd[a.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </p>

              {/* Profile + PIN */}
              {a.profile_name && (
                <p className="text-xs text-muted-foreground">Profile: <span className="text-foreground">{a.profile_name}</span></p>
              )}
              {a.pin && (
                <p className="text-xs text-muted-foreground">PIN: <span className="font-mono text-foreground">{a.pin}</span></p>
              )}

              {/* Assigned to */}
              {a.assigned_to_name && (
                <div className="mt-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <p className="font-semibold text-blue-400">{a.assigned_to_name}</p>
                  <p className="text-muted-foreground">{a.assigned_to_phone}</p>
                  {a.expires_at && (
                    <p className="text-muted-foreground">
                      Expires: {new Date(a.expires_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              )}

              {/* Vulnerable: PIN change CTA */}
              {a.is_vulnerable && (
                <button
                  onClick={() => { setPinModal(a); setNewPin(""); }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:opacity-90"
                  style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Confirm PIN Changed
                </button>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-1">
                <button
                  onClick={() => setEditing(a)}
                  className="flex-1 rounded-xl bg-muted px-2 py-1.5 text-xs font-semibold hover:bg-muted/70"
                >
                  Edit
                </button>
                <button
                  onClick={() => resetAccount(a)}
                  title="Expire + flag vulnerable"
                  className="rounded-xl bg-muted px-2 py-1.5 text-xs hover:bg-muted/70"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteAccount(a.id)}
                  className="rounded-xl bg-muted px-2 py-1.5 text-xs text-destructive hover:bg-muted/70"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Account Dialog ─────────────────────────────────────────────── */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prime Video Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email / Username</Label>
              <Input
                value={newAcc.account_email ?? ""}
                onChange={e => setNewAcc(p => ({ ...p, account_email: e.target.value }))}
                placeholder="prime@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                value={newAcc.account_password ?? ""}
                onChange={e => setNewAcc(p => ({ ...p, account_password: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Profile name (optional)</Label>
                <Input
                  value={newAcc.profile_name ?? ""}
                  onChange={e => setNewAcc(p => ({ ...p, profile_name: e.target.value }))}
                  placeholder="e.g. Guest"
                />
              </div>
              <div>
                <Label>PIN (optional)</Label>
                <Input
                  maxLength={6}
                  inputMode="numeric"
                  value={newAcc.pin ?? ""}
                  onChange={e => setNewAcc(p => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  placeholder="••••"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The PIN you enter here is stored as the default. Vulnerability is triggered when this PIN hasn't been changed after a trial ends.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addAccount} className="bg-primary">Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prime Video Account</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {editing.is_vulnerable && (
                <div
                  className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  This account is VULNERABLE. Use "Confirm PIN Changed" to clear it before reassigning.
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input
                  value={editing.account_email}
                  onChange={e => setEditing({ ...editing, account_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  value={editing.account_password}
                  onChange={e => setEditing({ ...editing, account_password: e.target.value })}
                />
              </div>
              <div>
                <Label>Profile name</Label>
                <Input
                  value={editing.profile_name ?? ""}
                  onChange={e => setEditing({ ...editing, profile_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assigned to (name)</Label>
                  <Input
                    value={editing.assigned_to_name ?? ""}
                    onChange={e => setEditing({ ...editing, assigned_to_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Assigned to (phone)</Label>
                  <Input
                    value={editing.assigned_to_phone ?? ""}
                    onChange={e => setEditing({ ...editing, assigned_to_phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={v => setEditing({ ...editing, status: v as TrialAccount["status"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                {editing.is_vulnerable && editing.status === "available" && (
                  <p className="mt-1 text-xs text-orange-400">
                    ⚠️ Cannot set to Available while vulnerable. Confirm PIN change first.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} className="bg-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PIN Confirmation Dialog ────────────────────────────────────────── */}
      <Dialog open={!!pinModal} onOpenChange={o => { if (!o) { setPinModal(null); setNewPin(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              Confirm PIN Changed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the <strong className="text-foreground">new PIN</strong> you just set on Prime Video for{" "}
              <span className="font-mono font-semibold text-foreground">{pinModal?.account_email}</span>.
              This confirms the PIN has been changed and clears the vulnerability flag.
            </p>
            <div>
              <Label>New PIN</Label>
              <Input
                maxLength={6}
                inputMode="numeric"
                placeholder="Enter new PIN"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="font-mono text-lg tracking-widest"
                autoFocus
              />
            </div>
            <div
              className="rounded-xl p-3 text-xs"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "rgba(255,255,255,0.5)" }}
            >
              After confirming: vulnerability cleared → status set to Available → account ready to assign again.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPinModal(null); setNewPin(""); }}>
              Cancel
            </Button>
            <Button
              onClick={confirmPinChange}
              className="gap-2"
              style={{ background: "#10b981", color: "#000" }}
            >
              <ShieldCheck className="h-4 w-4" />
              Confirm &amp; Clear Vulnerability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
