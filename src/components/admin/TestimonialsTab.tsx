import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";

type T = { id: string; customer_name: string; message: string; screenshot_url: string | null; rating: number | null; is_approved: boolean };
type M = { id: string; name: string; message: string; is_approved: boolean; created_at: string };

export function TestimonialsTab() {
  const [items, setItems] = useState<T[]>([]);
  const [messages, setMessages] = useState<M[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("testimonials").select("*").order("sort_order"),
      supabase.from("public_messages").select("*").order("created_at", { ascending: false }),
    ]);
    setItems((t ?? []) as T[]);
    setMessages((m ?? []) as M[]);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("screenshot") as File | null;

    let screenshot_url: string | null = null;
    if (file && file.size > 0) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("testimonial-screenshots").upload(path, file);
      setUploading(false);
      if (upErr) return toast.error(upErr.message);
      const { data } = supabase.storage.from("testimonial-screenshots").getPublicUrl(path);
      screenshot_url = data.publicUrl;
    }

    const { error } = await supabase.from("testimonials").insert({
      customer_name: String(fd.get("customer_name")),
      message: String(fd.get("message")),
      screenshot_url,
      is_approved: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    e.currentTarget.reset();
    load();
  };

  const toggle = async (t: T) => {
    await supabase.from("testimonials").update({ is_approved: !t.is_approved }).eq("id", t.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    load();
  };

  const approveMsg = async (m: M, approve: boolean) => {
    await supabase.from("public_messages").update({ is_approved: approve }).eq("id", m.id);
    load();
  };
  const removeMsg = async (id: string) => {
    await supabase.from("public_messages").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-display text-lg font-bold">Add testimonial</h3>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-2xl border border-border gradient-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Customer name</Label><Input name="customer_name" required /></div>
            <div><Label>Screenshot (optional)</Label><Input name="screenshot" type="file" accept="image/*" /></div>
          </div>
          <div><Label>Message</Label><Textarea name="message" required rows={3} /></div>
          <Button type="submit" disabled={uploading} className="rounded-full bg-primary">
            {uploading ? <><Upload className="mr-2 h-4 w-4 animate-pulse" /> Uploading…</> : <><Plus className="mr-1 h-4 w-4" /> Add</>}
          </Button>
        </form>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold">Existing testimonials</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {items.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border gradient-card p-4">
              {t.screenshot_url && <img src={t.screenshot_url} alt="" className="mb-3 w-full rounded-lg" loading="lazy" />}
              <p className="text-sm">"{t.message}"</p>
              <p className="mt-2 text-xs text-muted-foreground">— {t.customer_name}</p>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={t.is_approved} onCheckedChange={() => toggle(t)} /> Approved
                </label>
                <button onClick={() => remove(t.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold">Visitor messages (moderation)</h3>
        <div className="mt-3 space-y-2">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border gradient-card p-4">
              <div className="flex-1">
                <p className="text-sm">"{m.message}"</p>
                <p className="mt-1 text-xs text-muted-foreground">— {m.name} · {new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={m.is_approved} onCheckedChange={(v) => approveMsg(m, v)} /> Approved
                </label>
                <button onClick={() => removeMsg(m.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
