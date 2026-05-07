import { MousePointer2, MessageSquare, Send, Smartphone, Unlock } from "lucide-react";

const STEPS = [
  { Icon: MousePointer2, t: "Pick your plan above", d: "Tap the plan you want — Netflix, Spotify, or All Access." },
  { Icon: MessageSquare, t: "Enter your name & WhatsApp", d: "That's it. No card. No bank details." },
  { Icon: Send, t: "We send payment instructions", d: "We'll WhatsApp you within 5 minutes with the exact amount and mobile money number to use." },
  { Icon: Smartphone, t: "Send payment via mobile money", d: "Use MTN Mobile Money or Airtel Money. We'll tell you which number based on your network." },
  { Icon: Unlock, t: "We activate your account", d: "Within 15 minutes of confirmed payment, your streaming access is live with login details on WhatsApp." },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">How to get access</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Five simple steps. No card. No stress. Live in under 15 minutes.
          </p>
        </div>
        <ol className="mt-10 space-y-3">
          {STEPS.map(({ Icon, t, d }, i) => (
            <li key={i} className="flex items-start gap-4 rounded-2xl border border-border gradient-card p-4 sm:p-5">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-display text-base font-bold">{t}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
