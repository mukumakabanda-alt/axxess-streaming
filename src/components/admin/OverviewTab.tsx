import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShoppingCart, Clock, CheckCircle, Users, AlertCircle, DollarSign, Target, Sparkles, Bell } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeSubs: number;
  expiringSoon: number;
  revenue: number;
  bestSeller: string;
  repeatCustomers: number;
  trend: { date: string; orders: number; completed: number }[];
  recent: { id: string; customer_name: string; service_name_snapshot: string; status: string; created_at: string }[];
  referralsCount: number;
  conversionRate: number; // completed / (pending + completed)
};

type RewardUnlock = {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  tier_points: number;
  tier_label: string;
  acknowledged: boolean;
  created_at: string;
};

export function OverviewTab() {
  const [s, setS] = useState<Stats | null>(null);
  const [unlocks, setUnlocks] = useState<RewardUnlock[]>([]);

  const loadUnlocks = async () => {
    const { data } = await supabase
      .from("reward_unlocks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    setUnlocks((data ?? []) as RewardUnlock[]);
  };

  useEffect(() => {
    (async () => {
      const [{ data: orders }, { data: subs }, { count: refCount }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
      ]);

      const all = orders ?? [];
      const totalOrders = all.length;
      const pendingOrders = all.filter((o) => o.status === "pending").length;
      const completedOrders = all.filter((o) => o.status === "completed").length;
      const revenue = all
        .filter((o) => o.status === "completed" || o.status === "approved")
        .reduce((sum, o) => sum + Number(o.price_snapshot), 0);

      const counts: Record<string, number> = {};
      all.forEach((o) => { counts[o.service_name_snapshot] = (counts[o.service_name_snapshot] ?? 0) + 1; });
      const bestSeller = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      const phones: Record<string, number> = {};
      all.forEach((o) => { phones[o.customer_phone] = (phones[o.customer_phone] ?? 0) + 1; });
      const repeatCustomers = Object.values(phones).filter((n) => n > 1).length;

      const today = new Date(); today.setHours(0,0,0,0);
      const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
      const activeSubs = (subs ?? []).filter((s) => s.is_active && new Date(s.end_date) >= today).length;
      const expiringSoon = (subs ?? []).filter((s) => s.is_active && new Date(s.end_date) >= today && new Date(s.end_date) <= in7).length;

      // Conversion = completed / (pending + completed)
      const denom = pendingOrders + completedOrders;
      const conversionRate = denom > 0 ? (completedOrders / denom) * 100 : 0;

      // 14-day trend (orders + completed per day)
      const trend: { date: string; orders: number; completed: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const inDay = all.filter((o) => {
          const od = new Date(o.created_at);
          return od >= d && od < next;
        });
        trend.push({
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          orders: inDay.length,
          completed: inDay.filter((o) => o.status === "completed").length,
        });
      }

      setS({
        totalOrders, pendingOrders, completedOrders, activeSubs, expiringSoon,
        revenue, bestSeller, repeatCustomers, trend,
        recent: all.slice(0, 6) as any,
        referralsCount: refCount ?? 0,
        conversionRate,
      });
    })();
    loadUnlocks();
    // Refresh unlocks every 15s so the admin sees them quickly — but skip
    // the request entirely while this tab isn't the active one (admins
    // routinely leave this dashboard open in a background tab all day),
    // and catch up immediately the moment it's focused again.
    const t = setInterval(() => {
      if (document.hidden) return;
      loadUnlocks();
    }, 15000);
    const onVisible = () => { if (!document.hidden) loadUnlocks(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const acknowledge = async (id: string) => {
    await supabase.from("reward_unlocks").update({ acknowledged: true }).eq("id", id);
    setUnlocks((prev) => prev.map((u) => (u.id === id ? { ...u, acknowledged: true } : u)));
  };

  const acknowledgeAll = async () => {
    const ids = unlocks.filter((u) => !u.acknowledged).map((u) => u.id);
    if (!ids.length) return;
    await supabase.from("reward_unlocks").update({ acknowledged: true }).in("id", ids);
    toast.success("All unlock notifications cleared");
    loadUnlocks();
  };

  if (!s) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Total orders", value: s.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Pending", value: s.pendingOrders, icon: Clock, color: "text-yellow-400" },
    { label: "Completed", value: s.completedOrders, icon: CheckCircle, color: "text-green-400" },
    { label: "Conversion", value: `${s.conversionRate.toFixed(1)}%`, icon: Target, color: "text-green-400" },
    { label: "Active subs", value: s.activeSubs, icon: Users, color: "text-primary" },
    { label: "Expiring ≤7d", value: s.expiringSoon, icon: AlertCircle, color: "text-yellow-400" },
    { label: "Revenue", value: `K${s.revenue.toFixed(0)}`, icon: DollarSign, color: "text-green-400" },
    { label: "Best seller", value: s.bestSeller, icon: TrendingUp, color: "text-primary" },
  ];

  const newUnlocks = unlocks.filter((u) => !u.acknowledged);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border gradient-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-2 font-display text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Reward unlock notifications */}
      <div className="rounded-2xl border border-border gradient-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-4 w-4 text-primary" />
              {newUnlocks.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
              )}
            </div>
            <h3 className="font-display text-lg font-bold">Reward unlocks</h3>
            {newUnlocks.length > 0 && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                {newUnlocks.length} NEW
              </span>
            )}
          </div>
          {newUnlocks.length > 0 && (
            <Button size="sm" variant="outline" onClick={acknowledgeAll}>Mark all read</Button>
          )}
        </div>
        <ul className="mt-4 divide-y divide-border">
          {unlocks.length === 0 && <li className="py-3 text-sm text-muted-foreground">No reward unlocks yet.</li>}
          {unlocks.slice(0, 8).map((u) => (
            <li key={u.id} className={`flex items-center justify-between gap-3 py-3 ${!u.acknowledged ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {u.customer_name || u.customer_phone} unlocked <span className="text-primary">{u.tier_label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.tier_points} pts · {u.customer_phone} · {new Date(u.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {!u.acknowledged && (
                <Button size="sm" variant="ghost" onClick={() => acknowledge(u.id)}>Mark read</Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border gradient-card p-6">
        <h3 className="font-display text-lg font-bold">Orders vs completed (14 days)</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="date" stroke="oklch(0.55 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.55 0 0)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.07 0 0)", border: "1px solid oklch(0.18 0 0)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="orders" stroke="oklch(0.628 0.258 25.5)" strokeWidth={2.5} dot={{ r: 3 }} name="Orders" />
              <Line type="monotone" dataKey="completed" stroke="oklch(0.7 0.18 145)" strokeWidth={2} dot={{ r: 2 }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border gradient-card p-6">
          <h3 className="font-display text-lg font-bold">Recent activity</h3>
          <ul className="mt-4 divide-y divide-border">
            {s.recent.length === 0 && <li className="py-3 text-sm text-muted-foreground">No orders yet</li>}
            {s.recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.service_name_snapshot}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  o.status === "completed" ? "bg-green-500/20 text-green-400" :
                  o.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                  o.status === "rejected" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>{o.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border gradient-card p-6">
          <h3 className="font-display text-lg font-bold">Referrals</h3>
          <p className="mt-4 font-display text-4xl font-bold text-primary">{s.referralsCount}</p>
          <p className="text-sm text-muted-foreground">total referral codes generated</p>
        </div>
      </div>
    </div>
  );
                  }
