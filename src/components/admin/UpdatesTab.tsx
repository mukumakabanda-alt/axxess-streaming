import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Send, Loader2, Eye, Heart, Share2,
  TrendingUp, Newspaper, Flame, RefreshCw, Megaphone, ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/* ─────────────────────────────────────────────────────────────────────────
   NEWS PAGE PERFORMANCE
   Real, server-side stats for the /news page (TMDB + NewsData-powered
   entertainment feed). This reads public.news_engagement, which
   routes/news.tsx writes to on every view/like/share via the
   increment_news_view/like/share functions — see the migration
   20260703160000_news_engagement_tracking.sql.

   This used to be impossible to show here: /news articles are fetched
   live and were never rows in our database, and likes/views only ever
   lived in each visitor's own browser. That's now fixed — this section
   is the real thing, not a placeholder.
   ───────────────────────────────────────────────────────────────────── */
type Engagement = {
  article_key: string;
  headline: string;
  category: string | null;
  view_count: number;
  like_count: number;
  share_count: number;
  views_today: number;
  likes_today: number;
  shares_today: number;
};

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border gradient-card p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" style={accent ? { color: accent } : undefined} /> {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function NewsPerformance() {
  const [engagement, setEngagement] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    const { data, error } = await supabase.from("news_engagement").select("*");
    if (!error) setEngagement((data ?? []) as Engagement[]);
    setLoading(false);
    setRefreshing(false);
  };
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => engagement.reduce(
    (acc, e) => ({
      lifetimeReads:  acc.lifetimeReads  + (e.view_count   ?? 0),
      lifetimeLikes:  acc.lifetimeLikes  + (e.like_count   ?? 0),
      lifetimeShares: acc.lifetimeShares + (e.share_count  ?? 0),
      todayReads:     acc.todayReads     + (e.views_today  ?? 0),
      todayLikes:     acc.todayLikes     + (e.likes_today  ?? 0),
      todayShares:    acc.todayShares    + (e.shares_today ?? 0),
    }),
    { lifetimeReads: 0, lifetimeLikes: 0, lifetimeShares: 0, todayReads: 0, todayLikes: 0, todayShares: 0 },
  ), [engagement]);

  const mostViewedToday = useMemo(
    () => [...engagement].filter((e) => (e.views_today ?? 0) > 0).sort((a, b) => (b.views_today ?? 0) - (a.views_today ?? 0))[0] ?? null,
    [engagement],
  );

  const topAllTime = useMemo(
    () => [...engagement]
      .filter((e) => (e.view_count ?? 0) + (e.like_count ?? 0) + (e.share_count ?? 0) > 0)
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 5),
    [engagement],
  );

  const hasAnyData = engagement.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-bold">News page performance</h3>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(229,25,42,0.08)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.2)" }}
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !hasAnyData ? (
        <div className="rounded-2xl border border-border gradient-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No data yet — this fills in as soon as someone reads, likes, or shares a story on <span className="text-white/70">/news</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Lifetime totals — the headline numbers */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Eye}     label="Articles read"   value={totals.lifetimeReads.toLocaleString()}  accent="#0EA5E9" />
            <StatCard icon={Heart}   label="Lifetime likes"  value={totals.lifetimeLikes.toLocaleString()}  accent="#E5192A" />
            <StatCard icon={Share2}  label="Lifetime shares" value={totals.lifetimeShares.toLocaleString()} accent="#C9A84C" />
          </div>

          {/* Today */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today</p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Eye}    label="Reads today"  value={totals.todayReads} />
              <StatCard icon={Heart}  label="Likes today"  value={totals.todayLikes} />
              <StatCard icon={Share2} label="Shares today" value={totals.todayShares} />
            </div>
          </div>

          {/* Most viewed today */}
          {mostViewedToday && (
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(229,25,42,0.1), transparent)", border: "1px solid rgba(229,25,42,0.25)" }}>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "#E5192A" }}>
                <Flame className="h-3 w-3" /> Most viewed today
              </p>
              <h4 className="mt-1.5 font-display text-sm font-bold text-white line-clamp-2">{mostViewedToday.headline || mostViewedToday.article_key}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{mostViewedToday.views_today} reads today · {mostViewedToday.view_count} all-time</p>
            </div>
          )}

          {/* Top performing all-time */}
          {topAllTime.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Top performing, all-time
              </p>
              <div className="space-y-2">
                {topAllTime.map((e, i) => (
                  <div key={e.article_key} className="flex items-center gap-3 rounded-2xl border border-border gradient-card p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: "rgba(229,25,42,0.12)", color: "#E5192A" }}>
                      {i + 1}
                    </span>
                    <h4 className="flex-1 min-w-0 truncate font-display text-sm font-bold">{e.headline || e.article_key}</h4>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{e.view_count}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{e.like_count}</span>
                      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{e.share_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PUSH ANNOUNCEMENTS
   A separate feature from the News page above: these are admin-written
   posts stored in public.updates. Publishing one lights up the red dot on
   the bottom-nav "News" icon and can fire a WhatsApp/OneSignal push via
   notify-news. Kept here (de-emphasized, collapsed by default) rather
   than removed outright — deleting it would take your push-broadcast
   tool with it. Flip the section open if you want to post one.
   ───────────────────────────────────────────────────────────────────── */
type U = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
};

export function UpdatesTab() {
  const [items,   setItems]   = useState<U[]>([]);
  const [editing, setEditing] = useState<U | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("updates").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as U[]);
  };
  useEffect(() => { load(); }, []);

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
    <div className="space-y-8">
      <NewsPerformance />

      {/* ── Push announcements (secondary, collapsed) ── */}
      <div className="border-t border-border pt-5">
        <button
          onClick={() => setAnnouncementsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <h3 className="font-display text-sm font-bold text-muted-foreground">Push announcements</h3>
              <p className="text-xs text-muted-foreground/70">WhatsApp/push blasts — separate from the News page above</p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${announcementsOpen ? "rotate-180" : ""}`} />
        </button>

        {announcementsOpen && (
          <div className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setShowNew(true)} size="sm" className="rounded-full bg-primary">
                <Plus className="mr-1 h-3.5 w-3.5" /> New post
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No posts yet.</p>
            )}
            {items.map((u) => (
              <div key={u.id} className="rounded-2xl border border-border gradient-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold">{u.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{u.body}</p>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={u.is_published} onCheckedChange={() => toggle(u)} />
                    <button
                      onClick={() => sendPushNow(u)}
                      disabled={sendingId === u.id}
                      className="rounded-md p-1.5 hover:bg-muted disabled:opacity-50"
                      title="Send push now"
                    >
                      {sendingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditing(u)} className="rounded-md p-1.5 hover:bg-muted">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(u.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <input type="checkbox" name="is_published" defaultChecked={editing?.is_published ?? true} />
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
