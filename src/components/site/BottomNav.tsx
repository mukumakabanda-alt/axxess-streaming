import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookmarkPlus, Award, Headphones, Newspaper } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/reserve", label: "Reserve", Icon: BookmarkPlus },
  { to: "/rewards", label: "Rewards", Icon: Award },
  { to: "/contact", label: "Support", Icon: Headphones },
  { to: "/news", label: "News", Icon: Newspaper },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 pb-2">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex">
              <Link
                to={to}
                className="group relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-smooth"
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-smooth ${
                    active
                      ? "bg-primary/15 text-primary shadow-[0_0_18px_-2px_oklch(0.7_0.27_25.5/0.65)]"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-tight transition-smooth ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute -top-px left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_oklch(0.7_0.27_25.5/0.9)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
