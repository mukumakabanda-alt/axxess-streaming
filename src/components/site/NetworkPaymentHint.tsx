import { detectNetwork, paymentInstruction } from "@/lib/whatsapp";

/** Inline mobile-money instruction shown below a phone input. */
export function NetworkPaymentHint({ phone }: { phone: string }) {
  if (!phone || phone.replace(/\D/g, "").length < 3) return null;
  const net = detectNetwork(phone);
  const info = paymentInstruction(net);
  if (!info) {
    if (phone.replace(/\D/g, "").length >= 6) {
      return <p className="mt-2 text-xs text-muted-foreground">Network not detected — check your number.</p>;
    }
    return null;
  }
  const tone = info.tone === "mtn"
    ? { dot: "bg-yellow-400", text: "text-yellow-300", border: "border-yellow-500/40", bg: "bg-yellow-500/10" }
    : { dot: "bg-red-400", text: "text-red-300", border: "border-red-500/40", bg: "bg-red-500/10" };
  return (
    <div className={`mt-2 rounded-xl border ${tone.border} ${tone.bg} px-3 py-2 text-xs leading-relaxed`}>
      <p className={`flex items-center gap-1.5 font-bold uppercase tracking-wider ${tone.text}`}>
        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${tone.dot}`} /> {info.label}
      </p>
      <p className="mt-1 text-foreground/85">
        Send payment to <span className="font-bold text-foreground">{info.number}</span>
      </p>
      <p className="text-muted-foreground">Name: <span className="text-foreground/80">{info.name}</span></p>
    </div>
  );
}
