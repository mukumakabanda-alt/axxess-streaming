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
  Plus, Trash2, Eye, EyeOff, RotateCcw, UserPlus,
  ChevronLeft, AlertTriangle, ShieldCheck, KeyRound, Loader2,
} from "lucide-react";

type Account = {
  id: string;
  account_email: string;
  account_password: string;
  status: string;
  notes: string | null;
};

type Profile = {
  id: string;
  account_id: string;
  profile_index: number;
  profile_name: string;
  assigned_customer: string | null;
  pin: string | null;
  default_pin: string | null;
  is_vulnerable: boolean;
  status: string;
};

export function PrimeVideoAccountsTab() {
  const [accounts,   setAccounts]   = useState<Account[]>([]);
  const [profiles,   setProfiles]   = useState<Profile[]>([]);
  const [openId,     setOpenId]     = useState<string | null>(null);
  const [showPwd,    setShowPwd]    = useState<Record<string, boolean>>({});
  const [adding,     setAdding]     = useState(false);
  const [newEmail,   setNewEmail]   = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [editProfile,setEditProfile]= useState<Profile | null>(null);
  const [pinModal,   setPinModal]   = useState<Profile | null>(null);
  const [newPin,     setNewPin]     = useState("");

  const load = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("prime_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("prime_profiles").select("*").order("profile_index"),
    ]);
    setAccounts((a ?? []) as Account[]);
    setProfiles((p ?? []) as Profile[]);
  };
  useEffect(() => { load(); }, []);

  const profilesFor = (accountId: string) => {
    const byIndex = new Map<number, Profile>();
    profiles
      .filter(p => p.account_id === accountId)
      .sort((a, b) => a.profile_index - b.profile_index)
      .forEach((profile) => {
        if (!byIndex.has(profile.profile_index)) byIndex.set(profile.profile_index, profile);
      });
    return [...byIndex.values()];
  };

  const totals = useMemo(() => ({
    total:      accounts.length,
    active:     accounts.filter(a => a.status === "active").length,
    assigned:   profiles.filter(p => p.status === "active" || p.status === "locked").length,
    available:  profiles.filter(p => p.status === "available" && !p.is_vulnerable).length,
    vulnerable: profiles.filter(p => p.is_vulnerable).length,
  }), [accounts, profiles]);

  const addAccount = async () => {
    if (!newEmail || !newPwd) return toast.error("Email and password required");
    if (savingAccount) return;
    setSavingAccount(true);
    const { error } = await supabase.from("prime_accounts").insert({
      account_email:    newEmail.trim(),
      account_password: newPwd.trim(),
      status:           "active",
    });
    setSavingAccount(false);
    if (error) return toast.error(error.message);
    toast.success("Prime Video account added with 6 profile slots");
    setNewEmail(""); setNewPwd(""); setAdding(false);
    load();
  };

  const removeAccount = async (id: string) => {
    if (!confirm("Delete this Prime Video account and all its profiles?")) return;
    const { error } = await supabase.from("prime_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    if (openId === id) setOpenId(null);
    load();
  };

  const saveProfile = async (p: Profile) => {
    // BLOCK: cannot save as available if vulnerable
    if (p.is_vulnerable && p.status === "available") {
      toast.error("Change the PIN first before making this profile available.");
      return;
    }
    const { error } = await supabase.from("prime_profiles").update({
      profile_name:      p.profile_name,
      assigned_customer: p.assigned_customer,
      pin:               p.pin,
      status:            p.status,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditProfile(null);
    load();
  };

  const resetProfile = async (p: Profile) => {
    if (!confirm("Mark this profile as expired and flag it as vulnerable?")) return;
    const { error } = await supabase.from("prime_profiles").update({
      assigned_customer: null,
      status:            "available",
      is_vulnerable:     true,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);

    toast.warning(`Profile "${p.profile_name}" flagged as VULNERABLE. Change the PIN before reusing.`);
    load();
  };

  const quickAssign = async (accountId: string) => {
    const next = profilesFor(accountId).find(p => p.status === "available" && !p.is_vulnerable);
    if (!next) return toast.error("No clean available profiles");
    const customer = prompt("Customer name to assign:");
    if (!customer) return;
    const pin = prompt("5-digit PIN (optional):") ?? "";
    await supabase.from("prime_profiles").update({
      assigned_customer: customer.trim(),
      pin:               pin.replace(/\D/g, "").slice(0, 5) || null,
      status:            "active",
    }).eq("id", next.id);
    toast.success(`Assigned to ${next.profile_name}`);
    load();
  };

  // PIN change → clears vulnerable
  const confirmPinChange = async () => {
    if (!pinModal) return;
    if (!newPin || newPin.length < 5) {
      return toast.error("Enter the new 5-digit PIN you set on Prime Video.");
    }
    const { error } = await supabase.from("prime_profiles").update({
      pin:           newPin,
      default_pin:   newPin,
      is_vulnerable: false,
      status:        "available",
    }).eq("id", pinModal.id);
    if (error) return toast.error(error.message);
    toast.success("PIN updated. Vulnerability cleared. Profile is now available.");
    setPinModal(null);
    setNewPin("");
    load();
  };

  const open = openId ? accounts.find(a => a.id === openId) : null;

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total accounts", v: totals.total,      color: "text-white" },
          { label: "Active",         v: totals.active,     color: "text-green-400" },
          { label: "Assigned",       v: totals.assigned,   color: "text-blue-400" },
          { label: "Available",      v: totals.available,  color: "text-green-400" },
          { label: "Vulnerable",     v: totals.vulnerable, color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border gradient-card p-4">
            <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Vulnerable banner */}
      {totals.vulnerable > 0 && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
          <div>
            <p className="text-sm font-bold text-orange-400">
              {totals.vulnerable} vulnerable {totals.vulnerable === 1 ? "profile" : "profiles"} detected
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              These profiles have unchanged PINs from previous assignments. Open the profile, change the PIN on Prime Video, then confirm it here to clear the flag.
            </p>
          </div>
        </div>
      )}

      {!open ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Prime Video Accounts</h3>
              <p className="text-xs text-muted-foreground">Track shared accounts and their profiles.</p>
            </div>
            <Button onClick={() => setAdding(true)} className="rounded-full bg-primary">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.length === 0 && (
              <p className="text-sm text-muted-foreground">No Prime Video accounts yet.</p>
            )}
            {accounts.map(a => {
              const ps   = profilesFor(a.id);
              const used = ps.filter(p => p.status !== "available").length;
              const vuln = ps.filter(p => p.is_vulnerable).length;
              return (
                <div key={a.id} className="rounded-2xl border border-border gradient-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold">{a.account_email}</p>
                      <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        {showPwd[a.id] ? a.account_password : "••••••••"}
                        <button onClick={() => setShowPwd(s => ({ ...s, [a.id]: !s[a.id] }))}>
                          {showPwd[a.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{used}/{ps.length || 6} profiles used</span>
                    {vuln > 0 && (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-orange-500/15 text-orange-400">
                        <AlertTriangle className="h-2.5 w-2.5" /> {vuln} vulnerable
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <button onClick={() => quickAssign(a.id)} className="rounded-md p-1.5 hover:bg-muted" title="Quick assign">
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button onClick={() => removeAccount(a.id)} className="rounded-md p-1.5 text-destructive hover:bg-muted">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Button onClick={() => setOpenId(a.id)} variant="outline" className="mt-3 w-full rounded-full">
                    Open profiles
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="rounded-2xl border border-border gradient-card p-4">
            <p className="font-mono text-sm font-semibold">{open.account_email}</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              {showPwd[open.id] ? open.account_password : "••••••••"}
              <button onClick={() => setShowPwd(s => ({ ...s, [open.id]: !s[open.id] }))}>
                {showPwd[open.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profilesFor(open.id).map(p => (
              <div
                key={p.id}
                className="rounded-2xl border border-border gradient-card p-4"
                style={p.is_vulnerable ? { borderColor: "rgba(249,115,22,0.4)" } : {}}
              >
                <div className="flex items-start justify-between">
                  <p className="font-display text-base font-bold">{p.profile_name}</p>
                  {p.is_vulnerable ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <AlertTriangle className="h-2.5 w-2.5" /> Vulnerable
                    </span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      p.status === "available" ? "bg-green-500/20 text-green-400" :
                      p.status === "locked"    ? "bg-red-500/20 text-red-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>{p.status}</span>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">Assigned to</p>
                <p className="text-sm">{p.assigned_customer || <span className="text-muted-foreground">—</span>}</p>
                <p className="mt-2 text-xs text-muted-foreground">PIN</p>
                <p className="font-mono text-sm">{p.pin || <span className="text-muted-foreground">—</span>}</p>

                {/* Vulnerable: PIN change CTA */}
                {p.is_vulnerable && (
                  <button
                    onClick={() => { setPinModal(p); setNewPin(""); }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:opacity-90"
                    style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Confirm PIN Changed
                  </button>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  <button
                    onClick={() => setEditProfile(p)}
                    className="flex-1 rounded-md bg-muted px-2 py-1.5 text-xs hover:bg-muted/70"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => resetProfile(p)}
                    className="rounded-md bg-muted px-2 py-1.5 text-xs hover:bg-muted/70"
                    title="Expire + flag vulnerable"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add account dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Prime Video account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email / Username</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">6 profile slots will be created automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addAccount} disabled={savingAccount} className="bg-primary">
              {savingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog — this is where a misassigned profile is corrected:
          change "Assigned customer" to the right name and Save. */}
      <Dialog open={!!editProfile} onOpenChange={o => !o && setEditProfile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          {editProfile && (
            <div className="space-y-3">
              {editProfile.is_vulnerable && (
                <div
                  className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  VULNERABLE — use "Confirm PIN Changed" to clear before reassigning.
                </div>
              )}
              <div><Label>Profile name</Label>
                <Input value={editProfile.profile_name} onChange={e => setEditProfile({ ...editProfile, profile_name: e.target.value })} />
              </div>
              <div><Label>Assigned customer</Label>
                <Input value={editProfile.assigned_customer ?? ""} onChange={e => setEditProfile({ ...editProfile, assigned_customer: e.target.value })} />
              </div>
              <div><Label>PIN (5 digits)</Label>
                <Input maxLength={5} inputMode="numeric" value={editProfile.pin ?? ""} onChange={e => setEditProfile({ ...editProfile, pin: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editProfile.status} onValueChange={v => setEditProfile({ ...editProfile, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
                {editProfile.is_vulnerable && editProfile.status === "available" && (
                  <p className="mt-1 text-xs text-orange-400">⚠️ Cannot set to Available while vulnerable.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>Cancel</Button>
            <Button onClick={() => editProfile && saveProfile(editProfile)} className="bg-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN confirmation dialog */}
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
              Enter the <strong className="text-foreground">new PIN</strong> you just set on Prime Video for profile{" "}
              <span className="font-semibold text-foreground">{pinModal?.profile_name}</span>.
            </p>
            <div>
              <Label>New PIN</Label>
              <Input
                maxLength={5}
                inputMode="numeric"
                placeholder="•••••"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="font-mono text-lg tracking-widest"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPinModal(null); setNewPin(""); }}>Cancel</Button>
            <Button onClick={confirmPinChange} className="gap-2" style={{ background: "#10b981", color: "#000" }}>
              <ShieldCheck className="h-4 w-4" />
              Confirm &amp; Clear Vulnerability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
                                               }
