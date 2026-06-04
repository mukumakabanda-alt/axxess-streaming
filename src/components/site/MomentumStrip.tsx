import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function MomentumStrip() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .then(({ count }) => setCount(count ?? 0));
  }, []);

  const items = [
    "Netflix K70",
    "Prime Video K60",
    "All Access K140",
    "Activated in 15 min",
    "No card required",
    `${count ?? "—"}+ live subscribers`,
    "MTN & Airtel",
    "2-Day Free Trial",
  ];

  const row = (key: string) => (
    <div className="momentum-row" key={key}>
      {items.map((t, i) => (
        <span key={`${key}-${i}`} className="inline-flex items-center gap-4 px-4">
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px" }}>{t}</span>
          <span style={{ color: "#E5192A", fontWeight: 700 }}>·</span>
        </span>
      ))}
    </div>
  );

  return (
    <section
      className="momentum-strip relative w-full overflow-hidden"
      style={{
        background: "#0F0F0F",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 0",
      }}
      aria-label="Highlights"
    >
      <div className="momentum-track">
        {row("a")}
        {row("b")}
      </div>
      <style>{`
        .momentum-track {
          display: flex;
          width: max-content;
          animation: momentum-scroll 40s linear infinite;
        }
        .momentum-row { display: flex; flex-shrink: 0; }
        .momentum-strip:hover .momentum-track { animation-play-state: paused; }
        @keyframes momentum-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
