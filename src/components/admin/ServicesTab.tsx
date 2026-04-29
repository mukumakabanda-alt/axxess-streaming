import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { ACCENT_PRESETS, resolveAccentHex } from "@/lib/accent-colors";

type Service = {
  id: string;
  name: string;
  slug: string;
  price_kwacha: number;
  description: string | null;
  features: string[];
  badge: string | null;
  accent_color: string | null;
  sort_order: number;
  is_active: boolean;
};

export function ServicesTab() {
  const [items, setItems] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setItems((data ?? []).map((d: any) => ({ ...d, features: Array.isArray(d.features) ? d.features : [] })));
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
    load();
  };

  const save = async (data: Partial<Service> & { id?: string }) => {
    const payload: any = {
      name: data.name,
      slug: data.slug,
      price_kwacha: data.price_kwacha,
      description: data.description,
      features: data.features,
      badge: data.badge || null,
      accent_color: data.accent_color || null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      await supabase.from("services").update(payload).eq("id", data.id);
    } else {
      await supabase.from("services").insert(payload);
    }
    toast.success("Saved");
    setEditing(null); setShowNew(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="font-display text-lg font-bold">Services & packages</h3>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary"><Plus className="mr-1 h-4 w-4" /> Add service</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border gradient-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-display text-lg font-bold">{s.name}</h4>
                <p className="text-2xl font-bold text-primary">K{Number(s.price_kwacha)}<span className="text-xs text-muted-foreground">/mo</span></p>
              </div>
              <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
            </div>
            {s.description && <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(s)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => remove(s.id)} className="text-destructive"><Trash2 className="mr-1 h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <ServiceDialog
        open={showNew || !!editing}
        service={editing}
        onClose={() => { setEditing(null); setShowNew(false); }}
        onSave={save}
      />
    </div>
  );
}

function ServiceDialog({ open, service, onClose, onSave }: {
  open: boolean; service: Service | null;
  onClose: () => void; onSave: (s: any) => void;
}) {
  const [accent, setAccent] = useState<string>(service?.accent_color ?? "red");

  useEffect(() => {
    setAccent(service?.accent_color ?? "red");
  }, [service, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const features = String(fd.get("features") || "").split("\n").map((s) => s.trim()).filter(Boolean);
          onSave({
            id: service?.id,
            name: String(fd.get("name")),
            slug: String(fd.get("slug")),
            price_kwacha: Number(fd.get("price_kwacha")),
            description: String(fd.get("description") || ""),
            features,
            badge: String(fd.get("badge") || ""),
            accent_color: accent,
            sort_order: Number(fd.get("sort_order") || 0),
            is_active: fd.get("is_active") === "on",
          });
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input name="name" defaultValue={service?.name} required /></div>
            <div><Label>Slug</Label><Input name="slug" defaultValue={service?.slug} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price (K)</Label><Input name="price_kwacha" type="number" step="0.01" defaultValue={service?.price_kwacha} required /></div>
            <div><Label>Sort order</Label><Input name="sort_order" type="number" defaultValue={service?.sort_order ?? 0} /></div>
          </div>
          <div><Label>Description</Label><Textarea name="description" defaultValue={service?.description ?? ""} rows={2} /></div>
          <div><Label>Features (one per line)</Label><Textarea name="features" defaultValue={(service?.features ?? []).join("\n")} rows={4} /></div>
          <div><Label>Badge (optional)</Label><Input name="badge" defaultValue={service?.badge ?? ""} placeholder="Best Value" /></div>

          <div>
            <Label>Accent color</Label>
            <div className="mt-2 grid grid-cols-9 gap-2">
              {ACCENT_PRESETS.map((p) => {
                const selected = accent === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    title={p.label}
                    onClick={() => setAccent(p.value)}
                    className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                      selected ? "border-foreground scale-110" : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: p.hex }}
                  >
                    {selected && (
                      <Check
                        className="absolute inset-0 m-auto h-4 w-4"
                        style={{ color: p.hex === "#FFD60A" || p.hex === "#A3E635" ? "#000" : "#fff" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: resolveAccentHex(accent) }}
              />
              Selected: {ACCENT_PRESETS.find((p) => p.value === accent)?.label ?? accent}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? true} /> Active
          </label>
          <DialogFooter><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

