import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type U = { id: string; title: string; body: string; is_published: boolean; created_at: string };

export function UpdatesTab() {
  const [items,   setItems]   = useState<U[]>([]);
  const [editing, setEditing] = useState<U | null>(null);
  const [showNew, setShowNew] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-bold">Updates & announcements</h3>
        <Button onClick={() => setShowNew(true)} className="rounded-full bg-primary">
          <Plus className="mr-1 h-4 w-4" /> New post
        </Button>
      </div>

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
                <p className="mt-1 text-xs text-muted-foreground/50">
                  {new Date(u.created_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={u.is_published} onCheckedChange={() => toggle(u)} />
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
