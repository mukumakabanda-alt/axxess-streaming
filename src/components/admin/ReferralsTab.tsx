import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

type R = { id: string; owner_name: string; owner_phone: string; code: string; uses_count: number; visits_count: number; reward_days_earned: number; created_at: string };

export function ReferralsTab() {
  const [items, setItems] = useState<R[]>([]);

  const load = async () => {
    const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as R[]);
  };
  useEffect(() => { load(); }, []);

  const updateUses = async (r: R, delta: number) => {
    const uses = Math.max(0, r.uses_count + delta);
    const reward = uses * 10;
    await supabase.from("referrals").update({ uses_count: uses, reward_days_earned: reward }).eq("id", r.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete code?")) return;
    await supabase.from("referrals").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold">Referrals</h3>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Link visits</th>
                <th className="p-3 text-left">Uses</th>
                <th className="p-3 text-left">Reward (K)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No codes yet</td></tr>}
              {items.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-mono font-bold text-primary">{r.code}</td>
                  <td className="p-3">
                    <p className="font-semibold">{r.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{r.owner_phone}</p>
                  </td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => updateUses(r, -1)} className="h-6 w-6 rounded-md border border-border">−</button>
                      <span className="font-bold">{r.uses_count}</span>
                      <button onClick={() => updateUses(r, 1)} className="h-6 w-6 rounded-md border border-border">+</button>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-primary">{r.reward_days_earned}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => remove(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
