import { Wallet, Zap, Sparkles, Headphones } from "lucide-react";

const points = [
  { icon: Wallet, title: "Affordable pricing", body: "Cheapest streaming access in Zambia." },
  { icon: Zap, title: "Fast service", body: "Access details delivered in minutes." },
  { icon: Sparkles, title: "Easy process", body: "Order on WhatsApp. No accounts needed." },
  { icon: Headphones, title: "Reliable support", body: "Real humans, ready to help." },
];

export function Trust() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why Axxess</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Built on trust</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p, i) => (
            <div key={i} className="rounded-3xl border border-border gradient-card p-6 transition-smooth hover:border-primary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
