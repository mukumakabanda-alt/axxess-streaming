import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import logoAsset from "@/assets/axxess-entertainment-logo.png.asset.json";
const logo = logoAsset.url;

const NAV_LINKS = [
  { to: "/",        label: "Home",    hash: undefined  },
  { to: "/rewards", label: "Rewards", hash: undefined  },
  { to: "/reserve", label: "Reserve", hash: undefined  },
  { to: "/contact", label: "Support", hash: undefined  },
] as const;

export function SiteHeader() {
  const { pathname }    = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [visible,  setVisible]  = useState(true);
  const lastY = useRef(0);

  // Transparent over hero → glass on scroll
  // Also hides on scroll-down, reappears on scroll-up
  useEffect(() => {
    const onScroll = () => {
      const y   = window.scrollY;
      const dir = y > lastY.current ? "down" : "up";
      lastY.current = y;

      setScrolled(y > 40);
      // Only hide/show on interior pages — on home the hero is tall enough
      if (pathname === "/") {
        setVisible(true);
      } else {
        setVisible(dir === "up" || y < 60);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount so SSR → client state is correct
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const isHome = pathname === "/";

  return (
    <header
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        right:      0,
        zIndex:     50,
        // Transparent over hero, glass everywhere else / after scroll
        background: scrolled || !isHome
          ? "rgba(8,8,8,0.82)"
          : "transparent",
        backdropFilter: scrolled || !isHome ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled || !isHome ? "blur(16px)" : "none",
        borderBottom: scrolled || !isHome
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid transparent",
        transform:  visible ? "translateY(0)" : "translateY(-100%)",
        transition: [
          "background 0.4s ease",
          "backdrop-filter 0.4s ease",
          "border-color 0.4s ease",
          "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          "box-shadow 0.4s ease",
        ].join(", "),
        boxShadow: scrolled
          ? "0 1px 40px -8px rgba(0,0,0,0.7)"
          : "none",
      }}
    >
      <div
        className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6"
        style={{ height: 60 }}
      >

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link
          to="/"
          aria-label="Axxess Entertainment — home"
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <img
            src={logo}
            alt="Axxess Entertainment"
            draggable={false}
            style={{
              height:        36,
              width:         "auto",
              userSelect:    "none",
              // Slight brightness boost when header is transparent so logo
              // reads against the dark hero
              filter: scrolled || !isHome
                ? "brightness(1)"
                : "brightness(1.15)",
              transition: "filter 0.4s ease",
            }}
          />
        </Link>

        {/* ── Desktop nav links ─────────────────────────────────────────── */}
        <nav
          aria-label="Site navigation"
          className="hidden md:flex items-center gap-1"
        >
          {NAV_LINKS.map(({ to, label }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                style={{
                  position:     "relative",
                  padding:      "6px 14px",
                  borderRadius: 999,
                  fontSize:     "0.82rem",
                  fontWeight:   500,
                  letterSpacing:"0.01em",
                  color: active
                    ? "#ffffff"
                    : "rgba(255,255,255,0.52)",
                  background: active
                    ? "rgba(229,25,42,0.12)"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(229,25,42,0.25)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.52)";
                }}
              >
                {label}
                {/* Active underline dot */}
                {active && (
                  <span
                    aria-hidden="true"
                    style={{
                      position:     "absolute",
                      bottom:       3,
                      left:         "50%",
                      transform:    "translateX(-50%)",
                      width:        16,
                      height:       2,
                      borderRadius: 999,
                      background:   "#E5192A",
                      boxShadow:    "0 0 8px 1px rgba(229,25,42,0.7)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── CTA button ────────────────────────────────────────────────── */}
        <Link
          to="/"
          hash="plans"
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          6,
            borderRadius: 999,
            padding:      "8px 20px",
            fontSize:     "0.8rem",
            fontWeight:   600,
            color:        "#ffffff",
            background:   "#E5192A",
            border:       "1px solid rgba(229,25,42,0.5)",
            boxShadow:    "0 0 24px -6px rgba(229,25,42,0.6)",
            textDecoration: "none",
            transition:   "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
            flexShrink:   0,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform  = "scale(1.04)";
            el.style.boxShadow  = "0 0 32px -4px rgba(229,25,42,0.8)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform  = "scale(1)";
            el.style.boxShadow  = "0 0 24px -6px rgba(229,25,42,0.6)";
          }}
        >
          Order now
          <span aria-hidden="true" style={{ fontSize: "0.9em" }}>→</span>
        </Link>

      </div>

      {/* ── Thin red accent line at very bottom of header — only when scrolled */}
      <div
        aria-hidden="true"
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     1,
          background: "linear-gradient(90deg, transparent 0%, rgba(229,25,42,0.5) 30%, rgba(201,168,76,0.4) 60%, transparent 100%)",
          opacity:    scrolled ? 1 : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      />
    </header>
  );
   }
