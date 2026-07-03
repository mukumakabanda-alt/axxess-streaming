import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // willChange is applied right before the animation starts and cleared
    // once it finishes, instead of being set permanently in the base
    // style. A permanent willChange keeps this layer promoted to its own
    // compositor layer (a real memory cost) for the entire life of the
    // page, even for the ~99% of the time nothing is animating.
    el.style.willChange = "opacity, transform";
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

    // Release the promoted layer once the transition is done — belt-and-
    // braces in case `transitionend` doesn't fire (e.g. the route change
    // interrupts it), so we never leak a permanently-promoted layer.
    const releaseWillChange = () => { el.style.willChange = "auto"; };
    el.addEventListener("transitionend", releaseWillChange, { once: true });
    const fallback = setTimeout(releaseWillChange, 400);

    return () => {
      cancelAnimationFrame(id);
      clearTimeout(fallback);
      el.removeEventListener("transitionend", releaseWillChange);
    };
  }, [pathname]);

  return (
    <div ref={ref} style={{ opacity: 1 }}>
      {children}
    </div>
  );
}
