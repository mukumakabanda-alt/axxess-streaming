import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow-red">
            <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
          <div className="leading-tight">
            <span className="font-display text-lg font-bold tracking-tight">
              Axxess<span className="text-primary">.</span>
            </span>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Streaming</p>
          </div>
        </Link>
        <Link to="/" hash="plans" className="btn-primary-cta !px-5 !py-2 !text-xs">
          Order
        </Link>
      </div>
    </header>
  );
}
