import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Phone } from "lucide-react";

type R = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  note: string | null;
  status: string;
  created_at: string;
};

export function ReservationsTab() {
  const [items, setItems] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as R[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("reservations").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete reservation?")) return;
    await supabase.from("reservations").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Reservations / Waitlist</h3>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
          {items.length} total
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No reservations yet. When a customer reserves a slot, it'll appear here.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{r.customer_name}</p>
                  <a
                    href={`https://wa.me/${r.customer_phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {r.customer_phone}
                  </a>
                  <p className="mt-1 text-sm">
                    Wants: <span className="font-semibold">{r.service_name}</span>
                  </p>
                  {r.note && <p className="mt-1 text-xs italic text-muted-foreground">"{r.note}"</p>}
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-semibold"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={() => remove(r.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
