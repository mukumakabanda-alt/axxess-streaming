import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShoppingCart, Clock, CheckCircle, Users, AlertCircle, DollarSign, Activity, Eye, Target } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeSubs: number;
  expiringSoon: number;
  revenue: number;
  bestSeller: string;
  repeatCustomers: number;
  trend: { date: string; orders: number; visits: number }[];
  recent: { id: string; customer_name: string; service_name_snapshot: string; status: string; created_at: string }[];
  referralsCount: number;
  visitsToday: number;
  visitsTotal: number;
  conversionRate: number; // %
};

export function OverviewTab() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 13);
      since.setHours(0, 0, 0, 0);

      const [{ data: orders }, { data: subs }, { count: refCount }, { data: visits }, { count: visitsTotal }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
        supabase.from("page_visits").select("id, created_at, session_id").gte("created_at", since.toISOString()),
        supabase.from("page_visits").select("id", { count: "exact", head: true }),
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

      const visitsArr = visits ?? [];
      const visitsToday = visitsArr.filter((v) => new Date(v.created_at) >= today).length;

      // Conversion = orders today / unique sessions today
      const sessionsToday = new Set(
        visitsArr.filter((v) => new Date(v.created_at) >= today).map((v) => v.session_id ?? v.id),
      ).size;
      const ordersToday = all.filter((o) => new Date(o.created_at) >= today).length;
      const conversionRate = sessionsToday > 0 ? (ordersToday / sessionsToday) * 100 : 0;

      // 14-day trend (orders + unique-session visits per day)
      const trend: { date: string; orders: number; visits: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const oCount = all.filter((o) => {
          const od = new Date(o.created_at);
          return od >= d && od < next;
        }).length;
        const vSet = new Set(
          visitsArr
            .filter((v) => { const vd = new Date(v.created_at); return vd >= d && vd < next; })
            .map((v) => v.session_id ?? v.id),
        );
        trend.push({
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          orders: oCount,
          visits: vSet.size,
        });
      }

      setS({
        totalOrders, pendingOrders, completedOrders, activeSubs, expiringSoon,
        revenue, bestSeller, repeatCustomers, trend,
        recent: all.slice(0, 6) as any,
        referralsCount: refCount ?? 0,
        visitsToday,
        visitsTotal: visitsTotal ?? 0,
        conversionRate,
      });
    })();
  }, []);

  if (!s) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Visits today", value: s.visitsToday, icon: Eye, color: "text-primary" },
    { label: "Conversion", value: `${s.conversionRate.toFixed(1)}%`, icon: Target, color: "text-green-400" },
    { label: "Total visits", value: s.visitsTotal, icon: Activity, color: "text-primary" },
    { label: "Total orders", value: s.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Pending", value: s.pendingOrders, icon: Clock, color: "text-yellow-400" },
    { label: "Completed", value: s.completedOrders, icon: CheckCircle, color: "text-green-400" },
    { label: "Active subs", value: s.activeSubs, icon: Users, color: "text-primary" },
    { label: "Expiring ≤7d", value: s.expiringSoon, icon: AlertCircle, color: "text-yellow-400" },
    { label: "Revenue", value: `K${s.revenue.toFixed(0)}`, icon: DollarSign, color: "text-green-400" },
    { label: "Best seller", value: s.bestSeller, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="rounded-2xl border border-border gradient-card p-6">
        <h3 className="font-display text-lg font-bold">Visits vs orders (14 days)</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="date" stroke="oklch(0.55 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.55 0 0)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.07 0 0)", border: "1px solid oklch(0.18 0 0)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="visits" stroke="oklch(0.7 0.18 145)" strokeWidth={2} dot={{ r: 2 }} name="Visits" />
              <Line type="monotone" dataKey="orders" stroke="oklch(0.628 0.258 25.5)" strokeWidth={2.5} dot={{ r: 3 }} name="Orders" />
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
