import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

const KEYS = ["whatsapp_primary", "whatsapp_secondary", "whatsapp_group_link", "intro_video_url"] as const;

export function SettingsTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("*").in("key", KEYS as any);
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
    setValues(map);
  };
  useEffect(() => { load(); }, []);

  const saveAll = async () => {
    setSaving(true);
    for (const k of KEYS) {
      await supabase.from("site_settings").upsert({ key: k, value: values[k] ?? "", updated_at: new Date().toISOString() });
    }
    setSaving(false);
    toast.success("Settings saved");
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `intro-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("intro-video").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("intro-video").getPublicUrl(path);
    setValues((v) => ({ ...v, intro_video_url: data.publicUrl }));
    await supabase.from("site_settings").upsert({ key: "intro_video_url", value: data.publicUrl, updated_at: new Date().toISOString() });
    setUploading(false);
    toast.success("Video uploaded");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border gradient-card p-6">
        <h3 className="font-display text-lg font-bold">Contact & WhatsApp</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Primary WhatsApp number</Label>
            <Input value={values.whatsapp_primary ?? ""} onChange={(e) => setValues({ ...values, whatsapp_primary: e.target.value })} placeholder="260765101494" />
          </div>
          <div>
            <Label>Secondary WhatsApp</Label>
            <Input value={values.whatsapp_secondary ?? ""} onChange={(e) => setValues({ ...values, whatsapp_secondary: e.target.value })} placeholder="260762073206" />
          </div>
          <div className="sm:col-span-2">
            <Label>WhatsApp group link</Label>
            <Input value={values.whatsapp_group_link ?? ""} onChange={(e) => setValues({ ...values, whatsapp_group_link: e.target.value })} placeholder="https://chat.whatsapp.com/..." />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border gradient-card p-6">
        <h3 className="font-display text-lg font-bold">Intro video</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload a short MP4 (under 50MB recommended).</p>
        <div className="mt-4 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Choose video"}
            <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          </label>
          {values.intro_video_url && (
            <a href={values.intro_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Current video</a>
          )}
        </div>
        {values.intro_video_url && (
          <video src={values.intro_video_url} controls className="mt-4 w-full max-w-md rounded-xl bg-black" />
        )}
      </div>

      <Button onClick={saveAll} disabled={saving} className="rounded-full bg-primary">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save all settings"}
      </Button>
    </div>
  );
}
