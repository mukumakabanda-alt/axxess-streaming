import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShoppingCart, Clock, CheckCircle, Users, AlertCircle, DollarSign, Activity } from "lucide-react";
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
  trend: { date: string; orders: number }[];
  recent: { id: string; customer_name: string; service_name_snapshot: string; status: string; created_at: string }[];
  referralsCount: number;
};

export function OverviewTab() {
  const [s, setS] = useState<Stats | null>(null);

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

      // Best seller
      const counts: Record<string, number> = {};
      all.forEach((o) => { counts[o.service_name_snapshot] = (counts[o.service_name_snapshot] ?? 0) + 1; });
      const bestSeller = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      // Repeat customers (by phone)
      const phones: Record<string, number> = {};
      all.forEach((o) => { phones[o.customer_phone] = (phones[o.customer_phone] ?? 0) + 1; });
      const repeatCustomers = Object.values(phones).filter((n) => n > 1).length;

      // Subs
      const today = new Date(); today.setHours(0,0,0,0);
      const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
      const activeSubs = (subs ?? []).filter((s) => s.is_active && new Date(s.end_date) >= today).length;
      const expiringSoon = (subs ?? []).filter((s) => s.is_active && new Date(s.end_date) >= today && new Date(s.end_date) <= in7).length;

      // 14-day trend
      const trend: { date: string; orders: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const count = all.filter((o) => {
          const od = new Date(o.created_at);
          return od >= d && od < next;
        }).length;
        trend.push({ date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), orders: count });
      }

      setS({
        totalOrders, pendingOrders, completedOrders, activeSubs, expiringSoon,
        revenue, bestSeller, repeatCustomers, trend,
        recent: all.slice(0, 6) as any,
        referralsCount: refCount ?? 0,
      });
    })();
  }, []);

  if (!s) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Total orders", value: s.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Pending", value: s.pendingOrders, icon: Clock, color: "text-yellow-400" },
    { label: "Completed", value: s.completedOrders, icon: CheckCircle, color: "text-green-400" },
    { label: "Active subs", value: s.activeSubs, icon: Users, color: "text-primary" },
    { label: "Expiring ≤7d", value: s.expiringSoon, icon: AlertCircle, color: "text-yellow-400" },
    { label: "Revenue", value: `K${s.revenue.toFixed(0)}`, icon: DollarSign, color: "text-green-400" },
    { label: "Best seller", value: s.bestSeller, icon: TrendingUp, color: "text-primary" },
    { label: "Repeat customers", value: s.repeatCustomers, icon: Activity, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border gradient-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border gradient-card p-6">
        <h3 className="font-display text-lg font-bold">Sales trend (14 days)</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="date" stroke="oklch(0.55 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.55 0 0)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.07 0 0)", border: "1px solid oklch(0.18 0 0)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="orders" stroke="oklch(0.628 0.258 25.5)" strokeWidth={2.5} dot={{ r: 3 }} />
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
