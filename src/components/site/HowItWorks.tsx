import { ShoppingBag, CreditCard, Sparkles } from "lucide-react";

const steps = [
  { icon: ShoppingBag, title: "Choose your service", body: "Pick Spotify, Netflix, or the All Access bundle." },
  { icon: CreditCard, title: "Make payment", body: "Pay via Mobile Money or bank transfer — we'll guide you on WhatsApp." },
  { icon: Sparkles, title: "Receive access details", body: "Login details delivered to your WhatsApp within minutes." },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">3 simple steps</h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="group relative rounded-3xl border border-border gradient-card p-6 transition-smooth hover:border-primary/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-3xl font-bold text-muted-foreground/30">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
