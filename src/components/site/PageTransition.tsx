import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Kick a CSS animation directly on the DOM node — no state, no flicker,
    // no rAF race. The element goes from opacity 0 to 1 in 180ms then stays.
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    const id = setTimeout(() => {
      el.style.transition = "opacity 180ms ease-out, transform 180ms ease-out";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 16); // one frame — enough for the browser to register the starting state
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
