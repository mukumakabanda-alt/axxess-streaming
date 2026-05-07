import { useEffect, useState } from "react";
import { getUser } from "@/lib/customer";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";
import { Clock, AlertTriangle } from "lucide-react";

export function RenewalBanner() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u?.renewalDate) return;
    const ms = new Date(u.renewalDate).getTime() - Date.now();
    const d = Math.ceil(ms / 86400000);
    if (d <= 7 && d >= 0) setDays(d);
  }, []);

  if (days === null) return null;

  const urgent = days <= 3;
  const cls = urgent
    ? "border-destructive/60 bg-destructive/15 animate-pulse-glow"
    : "border-amber-500/40 bg-amber-500/10";
  const Icon = urgent ? AlertTriangle : Clock;
  const text = urgent
    ? `🚨 Only ${days} day${days === 1 ? "" : "s"} left! Renew now or lose access.`
    : `⏰ Your subscription renews in ${days} day${days === 1 ? "" : "s"}. Renew now to avoid losing access.`;

  return (
    <div className={`border-b ${cls} px-4 py-2.5`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={`h-4 w-4 ${urgent ? "text-destructive" : "text-amber-400"}`} /> {text}
        </p>
        <a
          href={waLink(WHATSAPP_PRIMARY, "Hi Axxess! I'd like to renew my subscription.")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-glow-red hover:bg-primary/90"
        >
          Renew via WhatsApp →
        </a>
      </div>
    </div>
  );
}
