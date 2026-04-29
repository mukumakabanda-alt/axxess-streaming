import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow-red">
            <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Axxess<span className="text-primary">.</span>
          </span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#plans" className="transition-smooth hover:text-foreground">Plans</a>
          <a href="#how" className="transition-smooth hover:text-foreground">How it works</a>
          <a href="#faq" className="transition-smooth hover:text-foreground">FAQ</a>
          <a href="#contact" className="transition-smooth hover:text-foreground">Contact</a>
        </nav>
        <a
          href="#plans"
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow-red transition-smooth hover:bg-primary/90"
        >
          Order
        </a>
      </div>
    </header>
  );
}
