import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  owner_name: z.string().trim().min(2).max(80),
  owner_phone: z.string().trim().min(9).max(20),
});

function genCode() {
  return "AXX-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function Referral() {
  const [code, setCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${code}`
    : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      owner_name: fd.get("owner_name"),
      owner_phone: fd.get("owner_phone"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const newCode = genCode();
    const { error } = await supabase.from("referrals").insert({ ...parsed.data, code: newCode });
    setSubmitting(false);
    if (error) {
      toast.error("Could not generate link. Try again.");
      return;
    }
    setCode(newCode);
    toast.success("Your referral link is ready!");
  };

  const copy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="referral" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-elegant sm:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Refer a friend</h2>
            <p className="text-sm text-muted-foreground">Earn <span className="text-primary font-semibold">+5 points</span> for every friend who joins.</p>
          </div>
        </div>

        {!code ? (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <Label htmlFor="owner_name">Your name</Label>
              <Input id="owner_name" name="owner_name" required maxLength={80} />
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="owner_phone">WhatsApp number</Label>
              <Input id="owner_phone" name="owner_phone" placeholder="+260 ..." required maxLength={20} />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 mt-2 rounded-full bg-primary py-6 font-semibold shadow-glow-red hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate My Referral Link"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl border border-primary/40 bg-background p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your referral link</p>
            <p className="mt-3 break-all rounded-lg bg-card p-3 font-mono text-sm text-primary">{referralLink}</p>
            <button
              onClick={copy}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <p className="mt-4 text-xs text-muted-foreground">
              Share this link. When friends visit through it, your visits count grows in our system, and you earn <span className="font-semibold text-primary">+5 points</span> per visit toward your rewards.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
