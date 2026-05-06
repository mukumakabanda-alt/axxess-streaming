import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Lock, Unlock, RotateCcw, UserPlus, ChevronLeft } from "lucide-react";

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
  status: string; // available | active | locked
};

export function NetflixAccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [editProfile, setEditProfile] = useState<Profile | null>(null);

  const load = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("netflix_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("netflix_profiles").select("*").order("profile_index"),
    ]);
    setAccounts((a ?? []) as Account[]);
    setProfiles((p ?? []) as Profile[]);
  };
  useEffect(() => { load(); }, []);

  const profilesFor = (accountId: string) =>
    profiles.filter((p) => p.account_id === accountId).sort((a, b) => a.profile_index - b.profile_index);

  const totals = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === "active").length;
    const assigned = profiles.filter((p) => p.status === "active" || p.status === "locked").length;
    const available = profiles.filter((p) => p.status === "available").length;
    return { total, active, assigned, available };
  }, [accounts, profiles]);

  const addAccount = async () => {
    if (!newEmail || !newPwd) return toast.error("Email and password required");
    const { error } = await supabase.from("netflix_accounts").insert({
      account_email: newEmail.trim(),
      account_password: newPwd.trim(),
      status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Netflix account added with 5 profile slots");
    setNewEmail(""); setNewPwd(""); setAdding(false);
    load();
  };

  const removeAccount = async (id: string) => {
    if (!confirm("Delete this Netflix account and all its profiles?")) return;
    const { error } = await supabase.from("netflix_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    if (openId === id) setOpenId(null);
    load();
  };

  const toggleAccountStatus = async (a: Account) => {
    const next = a.status === "active" ? "inactive" : "active";
    await supabase.from("netflix_accounts").update({ status: next }).eq("id", a.id);
    load();
  };

  const saveProfile = async (p: Profile) => {
    const { error } = await supabase.from("netflix_profiles").update({
      profile_name: p.profile_name,
      assigned_customer: p.assigned_customer,
      pin: p.pin,
      status: p.status,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditProfile(null);
    load();
  };

  const resetProfile = async (p: Profile) => {
    if (!confirm("Reset this profile? Clears user and PIN.")) return;
    await supabase.from("netflix_profiles").update({
      assigned_customer: null,
      pin: null,
      status: "available",
    }).eq("id", p.id);
    toast.success("Profile reset");
    load();
  };

  const toggleLock = async (p: Profile) => {
    const next = p.status === "locked" ? "active" : "locked";
    await supabase.from("netflix_profiles").update({ status: next }).eq("id", p.id);
    load();
  };

  const quickAssign = async (accountId: string) => {
    const next = profilesFor(accountId).find((p) => p.status === "available");
    if (!next) return toast.error("No available profiles");
    const customer = prompt("Customer name to assign:");
    if (!customer) return;
    const pin = prompt("4-digit PIN (optional):") ?? "";
    await supabase.from("netflix_profiles").update({
      assigned_customer: customer.trim(),
      pin: pin.replace(/\D/g, "").slice(0, 4) || null,
      status: "active",
    }).eq("id", next.id);
    toast.success(`Assigned to Profile ${next.profile_index}`);
    load();
  };

  const open = openId ? accounts.find((a) => a.id === openId) : null;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total accounts", v: totals.total },
          { label: "Active", v: totals.active },
          { label: "Assigned profiles", v: totals.assigned },
          { label: "Available", v: totals.available },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border gradient-card p-4">
            <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{s.v}</p>
          </div>
        ))}
      </div>

      {!open ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Netflix Accounts</h3>
              <p className="text-xs text-muted-foreground">Track shared accounts and 5 profiles each.</p>
            </div>
            <Button onClick={() => setAdding(true)} className="rounded-full bg-primary"><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.length === 0 && <p className="text-sm text-muted-foreground">No Netflix accounts yet.</p>}
            {accounts.map((a) => {
              const ps = profilesFor(a.id);
              const used = ps.filter((p) => p.status !== "available").length;
              return (
                <div key={a.id} className="rounded-2xl border border-border gradient-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold">{a.account_email}</p>
                      <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        {showPwd[a.id] ? a.account_password : "••••••••"}
                        <button onClick={() => setShowPwd((s) => ({ ...s, [a.id]: !s[a.id] }))}>
                          {showPwd[a.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{used}/5 profiles used</span>
                    <div className="flex gap-1">
                      <button onClick={() => quickAssign(a.id)} className="rounded-md p-1.5 hover:bg-muted" title="Quick assign"><UserPlus className="h-4 w-4" /></button>
                      <button onClick={() => toggleAccountStatus(a)} className="rounded-md p-1.5 hover:bg-muted" title="Toggle status">{a.status === "active" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
                      <button onClick={() => removeAccount(a.id)} className="rounded-md p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <Button onClick={() => setOpenId(a.id)} variant="outline" className="mt-3 w-full rounded-full">Open profiles</Button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Back</button>
          <div className="rounded-2xl border border-border gradient-card p-4">
            <p className="font-mono text-sm font-semibold">{open.account_email}</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              {showPwd[open.id] ? open.account_password : "••••••••"}
              <button onClick={() => setShowPwd((s) => ({ ...s, [open.id]: !s[open.id] }))}>
                {showPwd[open.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profilesFor(open.id).map((p) => (
              <div key={p.id} className="rounded-2xl border border-border gradient-card p-4">
                <div className="flex items-start justify-between">
                  <p className="font-display text-base font-bold">{p.profile_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    p.status === "available" ? "bg-green-500/20 text-green-400" :
                    p.status === "locked" ? "bg-red-500/20 text-red-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>{p.status}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Assigned to</p>
                <p className="text-sm">{p.assigned_customer || <span className="text-muted-foreground">—</span>}</p>
                <p className="mt-2 text-xs text-muted-foreground">PIN</p>
                <p className="font-mono text-sm">{p.pin || <span className="text-muted-foreground">—</span>}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <button onClick={() => setEditProfile(p)} className="flex-1 rounded-md bg-muted px-2 py-1.5 text-xs hover:bg-muted/70">Edit</button>
                  <button onClick={() => toggleLock(p)} className="rounded-md bg-muted px-2 py-1.5 text-xs hover:bg-muted/70" title="Lock/Unlock">{p.status === "locked" ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</button>
                  <button onClick={() => resetProfile(p)} className="rounded-md bg-muted px-2 py-1.5 text-xs hover:bg-muted/70" title="Reset"><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add account dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Netflix account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email / Username</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">5 profile slots will be created automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addAccount} className="bg-primary">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog */}
      <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          {editProfile && (
            <div className="space-y-3">
              <div><Label>Profile name</Label><Input value={editProfile.profile_name} onChange={(e) => setEditProfile({ ...editProfile, profile_name: e.target.value })} /></div>
              <div><Label>Assigned customer</Label><Input value={editProfile.assigned_customer ?? ""} onChange={(e) => setEditProfile({ ...editProfile, assigned_customer: e.target.value })} /></div>
              <div><Label>PIN (4 digits)</Label><Input maxLength={4} inputMode="numeric" value={editProfile.pin ?? ""} onChange={(e) => setEditProfile({ ...editProfile, pin: e.target.value.replace(/\D/g, "").slice(0,4) })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editProfile.status} onValueChange={(v) => setEditProfile({ ...editProfile, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>Cancel</Button>
            <Button onClick={() => editProfile && saveProfile(editProfile)} className="bg-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
