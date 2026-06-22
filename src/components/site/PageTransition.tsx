import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Start invisible, then animate in on the next frame.
    // willChange hints the compositor to promote this layer early,
    // eliminating the repaint that caused the blank flash.
    el.style.opacity    = "0";
    el.style.transform  = "translateY(6px)";
    el.style.transition = "none";

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "opacity 180ms ease-out, transform 180ms ease-out";
        el.style.opacity    = "1";
        el.style.transform  = "translateY(0)";
      });
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      ref={ref}
      style={{ opacity: 1, willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}
