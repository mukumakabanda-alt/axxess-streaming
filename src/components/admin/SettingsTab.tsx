import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Users, Newspaper, Info } from "lucide-react";

// Every key here is read live by the public site — nothing obsolete.
// whatsapp_group_link -> src/routes/contact.tsx ("Join the community")
// news_banner_enabled / news_banner_message -> src/routes/news.tsx (sticky conversion banner)
// news_hero_enabled -> src/routes/news.tsx (featured story hero at the top)
// news_cache_minutes -> src/routes/news.tsx (how long a fetched news batch is cached before refetching)
const KEYS = [
  "whatsapp_group_link",
  "news_banner_enabled",
  "news_banner_message",
  "news_hero_enabled",
  "news_cache_minutes",
] as const;

const DEFAULTS: Record<string, string> = {
  whatsapp_group_link: "",
  news_banner_enabled: "true",
  news_banner_message: "🎬 Everything you're reading about — watch it. Netflix K70 · Prime K60",
  news_hero_enabled: "true",
  news_cache_minutes: "45",
};

export function SettingsTab() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*").in("key", KEYS as any);
    const map: Record<string, string> = { ...DEFAULTS };
    (data ?? []).forEach((r: any) => {
      if (r.value !== null && r.value !== "") map[r.key] = r.value;
    });
    setValues(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const k of KEYS) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: k, value: values[k] ?? "", updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      toast.success("Settings saved — live on the site now");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold">Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below is live-connected — change it here, it changes on the site.
        </p>
      </div>

      {/* Community & contact */}
      <div className="rounded-2xl border border-border gradient-card p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-bold">Community</h3>
        </div>
        <div className="mt-4">
          <Label>WhatsApp group link</Label>
          <Input
            value={values.whatsapp_group_link}
            onChange={(e) => set("whatsapp_group_link", e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Shown on the Contact page's "Join the community" button.
          </p>
        </div>
        <div className="mt-4 flex gap-2 rounded-xl p-3" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Your support number and payment numbers live in code (<code className="text-[11px]">src/lib/whatsapp.ts</code>), not here — changing them needs a code edit, not a settings edit. Say the word if you want those made editable from this screen too.
          </p>
        </div>
      </div>

      {/* News page controls */}
      <div className="rounded-2xl border border-border gradient-card p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Newspaper className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-bold">News page</h3>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 py-2">
          <div>
            <Label>Featured story hero</Label>
            <p className="text-xs text-muted-foreground">Big cinematic story pinned to the top of /news.</p>
          </div>
          <Switch
            checked={values.news_hero_enabled === "true"}
            onCheckedChange={(c) => set("news_hero_enabled", c ? "true" : "false")}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 py-2 border-t border-border">
          <div>
            <Label>Conversion banner</Label>
            <p className="text-xs text-muted-foreground">Sticky "watch it now" strip under the category tabs.</p>
          </div>
          <Switch
            checked={values.news_banner_enabled === "true"}
            onCheckedChange={(c) => set("news_banner_enabled", c ? "true" : "false")}
          />
        </div>

        {values.news_banner_enabled === "true" && (
          <div className="mt-2">
            <Label>Banner message</Label>
            <Textarea
              value={values.news_banner_message}
              onChange={(e) => set("news_banner_message", e.target.value)}
              rows={2}
              maxLength={140}
            />
          </div>
        )}

        <div className="mt-4">
          <Label>Refresh live news every</Label>
          <Select value={values.news_cache_minutes} onValueChange={(v) => set("news_cache_minutes", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            How long a visitor's feed is cached before Axxess News re-fetches from TMDB/NewsData. Lower = fresher but more API calls.
          </p>
        </div>
      </div>

      <Button onClick={saveAll} disabled={saving} className="w-full rounded-full bg-primary sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save all settings"}
      </Button>
    </div>
  );
}
