import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setShown(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`transition-opacity duration-200 ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
