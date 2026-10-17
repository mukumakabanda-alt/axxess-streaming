import { useEffect, useState } from "react";
import { ArrowRight, Gamepad2, MapPin, X } from "lucide-react";
import { useSiteConfig } from "@/lib/siteConfig";

const TIERS = [
  { label: "24 HRS", duration: "24 hrs", price: 80,  tag: null as string | null },
  { label: "3 DAYS", duration: "3 days", price: 250, tag: null },
  { label: "7 DAYS", duration: "7 days", price: 400, tag: "BEST VALUE" },
];

export function PS4RentalStrip() {
  const cfg = useSiteConfig();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const bookLink = (duration: string) =>
    `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(
      `Hi Axxess! I want to rent the PS4 for ${duration}. My area is ___ and I need it from ___.`
    )}`;

  return (
    <section id="ps4" className="px-4 pb-24 sm:px-6" style={{ background: "#080808" }}>
      <div className="mx-auto max-w-5xl">
        <div
          className="relative flex flex-col gap-4 overflow-hidden rounded-3xl p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8"
          style={{
            background: "rgba(12,12,12,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Badges */}
          <div className="absolute right-4 top-4 flex gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: "rgba(229,25,42,0.15)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.3)" }}
            >
              Kitwe only
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: "#E5192A", color: "#fff" }}
            >
              New
            </span>
          </div>

          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(229,25,42,0.12)", border: "1px solid rgba(229,25,42,0.25)" }}
          >
            <Gamepad2 className="h-7 w-7" style={{ color: "#E5192A" }} />
          </div>

          <div className="flex-1 pr-16 sm:pr-0">
            <h3 className="font-display text-xl font-bold text-white">Rent a PS4</h3>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Netflix + Prime Video free while you have it
            </p>
            <p className="mt-2 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              From <span style={{ color: "#E5192A" }}>K80</span> / 24 hrs
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#E5192A", color: "#fff", boxShadow: "0 0 28px -6px rgba(229,25,42,0.4)" }}
          >
            See prices <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{
              background: "#101010",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              animation: "ps4-sheet-up 300ms cubic-bezier(0.16,1,0.3,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes ps4-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">PS4 rental · Kitwe only</h3>
                <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Tap a duration to book on WhatsApp
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {TIERS.map((t) => (
                <a
                  key={t.label}
                  href={bookLink(t.duration)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all hover:border-white/20 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {t.label}
                  </span>
                  {t.tag && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ background: "#E5192A", color: "#fff" }}
                    >
                      {t.tag}
                    </span>
                  )}
                  <span className="ml-auto font-display text-lg font-black text-white">K{t.price}</span>
                  <ArrowRight className="h-4 w-4" style={{ color: "#E5192A" }} />
                </a>
              ))}
            </div>

            <p className="mt-5 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Includes PS4 Standard, 1 controller, FIFA 17 + Tomb Raider, and free Netflix + Prime Video for the whole rental.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <MapPin className="h-3 w-3" style={{ color: "#E5192A" }} />
              Riverside · Parklands · Nkana East &amp; nearby areas
            </p>

            <a
              href="#plans"
              onClick={() => setOpen(false)}
              className="mt-4 block text-center text-xs font-medium transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Not in Kitwe? Streaming works anywhere in Zambia ↑
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
