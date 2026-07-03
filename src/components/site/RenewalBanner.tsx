import { useEffect, useState } from "react";
import { getUser } from "@/lib/customer";
import { normalizePhone } from "@/lib/whatsapp";
import { Clock, AlertTriangle } from "lucide-react";

export function RenewalBanner() {
  const [days,  setDays]  = useState<number | null>(null);
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    const u = getUser();
    if (!u?.renewalDate) return;
    const ms = new Date(u.renewalDate).getTime() - Date.now();
    const d  = Math.ceil(ms / 86400000);
    // Show for 7 days out through however long they've been expired —
    // lapsed customers are the ones most likely to churn for good, so
    // they need this nudge more than anyone, not less.
    if (d <= 7) {
      setDays(d);
      setPhone(normalizePhone(u.whatsapp || ""));
    }
  }, []);

  if (days === null) return null;

  const expired = days < 0;
  const urgent  = expired || days <= 3;
  const cls     = urgent
    ? "relative border-destructive/60 bg-destructive/15 animate-pulse-glow"
    : "border-amber-500/40 bg-amber-500/10";
  const Icon = urgent ? AlertTriangle : Clock;
  const text = expired
    ? `🚨 Your access ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Renew now to restore it.`
    : urgent
    ? `🚨 Only ${days} day${days === 1 ? "" : "s"} left! Renew now or lose access.`
    : `⏰ Your subscription renews in ${days} day${days === 1 ? "" : "s"}. Renew to keep access.`;

  // Deep-link to /renew with phone pre-filled so they land straight on
  // their subscription details without typing anything
  const renewUrl = `/renew${phone ? `?phone=${phone}` : ""}`;

  return (
    <div className={`border-b ${cls} px-4 py-2.5`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={`h-4 w-4 ${urgent ? "text-destructive" : "text-amber-400"}`} /> {text}
        </p>
        <a
          href={renewUrl}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-glow-red hover:bg-primary/90 transition-all"
        >
          Renew Now →
        </a>
      </div>
    </div>
  );
            }
