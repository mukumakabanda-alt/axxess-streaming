import { useEffect, useState } from "react";
import { getUser, firstName } from "@/lib/customer";

const SHOWN_KEY = "axx_welcome_shown";

export function WelcomeBackToast() {
  const [name, setName] = useState<string>("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    const u = getUser();
    if (!u?.name) return;
    sessionStorage.setItem(SHOWN_KEY, "1");
    const t1 = setTimeout(() => { setName(firstName(u.name)); setShow(true); }, 1500);
    const t2 = setTimeout(() => setShow(false), 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show || !name) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 top-20 z-[55] sm:right-5"
       style={{ animation: "reward-slide 4.5s cubic-bezier(.4,0,.2,1) forwards" }}
    >
      <div className="pointer-events-auto rounded-full border border-primary/30 bg-card/95 px-4 py-2 text-xs font-medium text-foreground/90 shadow-card backdrop-blur-md">
        Welcome back, <span className="font-bold text-primary">{name}</span> 👋
      </div>
    </div>
  );
}
