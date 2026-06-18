import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Copy, Check, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { rememberCustomer, getRememberedName, getRememberedPhone } from "@/lib/customer";

const schema = z.object({
  owner_name:  z.string().trim().min(2).max(80),
  owner_phone: z.string().trim().min(9).max(20),
});

function genCode() {
  return "AXX-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function Referral() {
  const [code,       setCode]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [shared,     setShared]     = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://axxess-streaming.lovable.app";

  // ✅ FIX: referralLink now includes ?ref=CODE so referrals are tracked
  const referralLink = code ? `${origin}/?ref=${code}` : "";

  // The message shared — human, warm, Zambian
  const shareMessage = `Hey! 👋 Get Netflix or Prime Video in Zambia — K70/mo, no card needed, activated in 15 mins via WhatsApp.\n\nSign up through my link and we both benefit: ${referralLink}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd     = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      owner_name:  fd.get("owner_name"),
      owner_phone: fd.get("owner_phone"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const newCode   = genCode();
    const { error } = await supabase.from("referrals").insert({ ...parsed.data, code: newCode });
    setSubmitting(false);
    if (error) { toast.error("Could not generate link. Try again."); return; }
    rememberCustomer(parsed.data.owner_name, parsed.data.owner_phone);
    setCode(newCode);
    toast.success("Your referral link is ready! Share it and earn +10 points per signup.");
  };

  const copy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Axxess Entertainment",
          text:  shareMessage,
          url:   referralLink,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  return (
    <section id="referral" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div
          className="rounded-3xl border border-border overflow-hidden shadow-elegant"
          style={{ background: "linear-gradient(160deg, rgba(22,10,12,1) 0%, rgba(14,14,18,1) 100%)" }}
        >
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #E5192A, #C9A84C, #E5192A)", backgroundSize: "200% 100%" }} />

          <div className="p-8 sm:p-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(229,25,42,0.12)", border: "1px solid rgba(229,25,42,0.3)", boxShadow: "0 0 30px -8px rgba(229,25,42,0.45)" }}>
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Refer a friend</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Earn <span className="font-semibold text-primary">+10 points</span> for every friend who joins via your link.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { step: "01", label: "Generate your unique link" },
                { step: "02", label: "Share it on WhatsApp or socials" },
                { step: "03", label: "Friend joins → you earn +10 pts" },
              ].map(({ step, label }) => (
                <div key={step} className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="font-display text-2xl font-black" style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text", backgroundImage: "linear-gradient(135deg, #E5192A, #C9A84C)", display: "inline-block" }}>
                    {step}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{label}</p>
                </div>
              ))}
            </div>

            {!code ? (
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="owner_name" className="text-xs uppercase tracking-wider text-muted-foreground">Your name</Label>
                  <Input id="owner_name" name="owner_name" required maxLength={80} defaultValue={getRememberedName()} className="mt-1.5" placeholder="e.g. Mwape" />
                </div>
                <div>
                  <Label htmlFor="owner_phone" className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp number</Label>
                  <Input id="owner_phone" name="owner_phone" placeholder="+260 7XX XXX XXX" required maxLength={20} defaultValue={getRememberedPhone()} className="mt-1.5" />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="sm:col-span-2 mt-2 flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #E5192A, #c01020)", boxShadow: "0 0 32px -8px rgba(229,25,42,0.65)", fontSize: "0.95rem" }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gift className="h-4 w-4" /> Generate My Referral Link</>}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl p-6 sm:p-8" style={{ background: "rgba(229,25,42,0.06)", border: "1px solid rgba(229,25,42,0.25)", boxShadow: "0 0 40px -16px rgba(229,25,42,0.35)" }}>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-4">Your referral link</p>

                {/* Link pill */}
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="flex-1 truncate font-mono text-sm text-primary">{referralLink}</span>
                  <button
                    onClick={copy}
                    className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{ background: copied ? "rgba(16,185,129,0.15)" : "rgba(229,25,42,0.15)", border: copied ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(229,25,42,0.35)", color: copied ? "#10b981" : "#E5192A" }}
                  >
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                </div>

                {/* Share buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={share}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white text-sm transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #E5192A, #c01020)", boxShadow: "0 0 24px -6px rgba(229,25,42,0.6)" }}
                  >
                    {shared ? <><Check className="h-4 w-4" /> Shared!</> : <><Share2 className="h-4 w-4" /> Share Link</>}
                  </button>

                  {/* ✅ FIX: WhatsApp share now includes ?ref=CODE in the URL */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white text-sm transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 0 24px -8px rgba(37,211,102,0.5)" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Share on WhatsApp
                  </a>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Every friend who joins through your link earns you <span className="text-primary font-semibold">+10 points</span> toward rewards.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
