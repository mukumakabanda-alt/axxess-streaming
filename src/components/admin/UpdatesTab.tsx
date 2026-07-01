import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Send, Loader2, Eye, Heart, Share2, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type U = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  view_count: number | null;
  like_count: number | null;
  share_count: number | null;
};

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth() &&
         d.getDate()      === now.getDate();
}

export function UpdatesTab() {
  const [items,   setItems]   = useState<U[]>([]);
  const [editing, setEditing] = useState<U | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("updates").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as U[]);
  };
  useEffect(() => { load(); }, []);

  // Today's totals across all posts — driven by per-post *_today columns
  // that the public event tracker increments and a nightly reset job zeros
  // out. See the "Today" stats row below.
  const todayStats = useMemo(() => {
    const reads  = items.reduce((sum, u: any) => sum + (u.views_today  ?? 0), 0);
    const shares = items.reduce((sum, u: any) => sum + (u.shares_today ?? 0), 0);
    const likes  = items.reduce((sum, u: any) => sum + (u.likes_today  ?? 0), 0);
    return { reads, shares, likes };
  }, [items]);

  const topPerforming = useMemo(() => {
    return [...items]
      .filter(u => (u.view_count ?? 0) > 0 || (u.like_count ?? 0) > 0 || (u.share_count ?? 0) > 0)
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 3);
  }, [items]);

  const save = async (data: { id?: string; title: string; body: string; is_published?: boolean }) => {
    const payload = { title: data.title, body: data.body, is_published: data.is_published ?? true };
    if (data.id) await supabase.from("updates").update(payload).eq("id", data.id);
    else         await supabase.from("updates").insert(payload);
    toast.success("Saved");
    setEditing(null);
    setShowNew(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("updates").delete().eq("id", id);
    load();
  };

  const toggle = async (u: U) => {
    await supabase.from("updates").update({ is_published: !u.is_published }).eq("id", u.id);
    load();
  };

  // Manual override/retest path for the notify-news edge function. It's
  // shaped as a fake "just published" webhook payload, which is what
  // notify-news expects from the real Database Webhook. notify-news itself
  // dedupes on notification_log (entity_type='update', entity_id, reminder_key
  // ='news_broadcast'), so this — like the real webhook — can only succeed
  // once per post; calling it again for an already-sent post returns
  // "already sent" rather than re-sending.
  const sendPushNow = async (u: U) => {
    if (!confirm(`Send a push notification for "${u.title}" now?`)) return;
    setSendingId(u.id);
    const { data, error } = await supabase.functions.invoke("notify-news", {
      body: {
        type: "UPDATE",
        record: { id: u.id, title: u.title, body: u.body, is_published: true },
        old_record: { is_published: false },
      },
    });
    setSendingId(null);
    if (error) return toast.error("Push failed: " + error.message);
    if (data?.skipped) return toast(`Not sent — ${data.skipped}`);
    if (data?.ok === false) return toast.error("Push failed — check notification_log for details");
    toast.success("Push sent!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-bold">Updates & announcements</h3>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary">
          <Plus className="mr-1 h-4 w-4" /> New post
        </Button>
      </div>

      {/* Today's engagement */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border gradient-card p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
            <Eye className="h-3 w-3" /> Reads today
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{todayStats.reads}</p>
        </div>
        <div className="rounded-2xl border border-border gradient-card p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
            <Share2 className="h-3 w-3" /> Shares today
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{todayStats.shares}</p>
        </div>
        <div className="rounded-2xl border border-border gradient-card p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
            <Heart className="h-3 w-3" /> Likes today
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{todayStats.likes}</p>
        </div>
      </div>

      {/* Top performing */}
      {topPerforming.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Top performing
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {topPerforming.map((u, i) => (
              <div key={u.id} className="rounded-2xl border border-border gradient-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A" }}>
                    #{i + 1}
                  </span>
                </div>
                <h4 className="mt-2 font-display text-sm font-bold line-clamp-2">{u.title}</h4>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {u.view_count ?? 0}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {u.like_count ?? 0}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {u.share_count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        )}
        {items.map((u) => (
          <div key={u.id} className="rounded-2xl border border-border gradient-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-display font-bold">{u.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{u.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(u.created_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {u.view_count ?? 0}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {u.like_count ?? 0}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {u.share_count ?? 0}</span>
                  {isToday(u.created_at) && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      New today
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={u.is_published} onCheckedChange={() => toggle(u)} />
                <button
                  onClick={() => sendPushNow(u)}
                  disabled={sendingId === u.id}
                  className="rounded-md p-1.5 hover:bg-muted disabled:opacity-50"
                  title="Send push now"
                >
                  {sendingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(u)}
                  className="rounded-md p-1.5 hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(u.id)}
                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={showNew || !!editing}
        onOpenChange={(o) => { if (!o) { setShowNew(false); setEditing(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              save({
                id:           editing?.id,
                title:        String(fd.get("title")),
                body:         String(fd.get("body")),
                is_published: fd.get("is_published") === "on",
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label>Title</Label>
              <Input name="title" defaultValue={editing?.title} required maxLength={120} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea name="body" defaultValue={editing?.body} required rows={4} maxLength={1000} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={editing?.is_published ?? true}
              />
              Published
            </label>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
