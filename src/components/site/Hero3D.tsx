import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
type ShowItem = {
  title:    string;
  platform: "netflix" | "prime";
  poster:   string;
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  STATIC FALLBACK — used when TMDB key is missing or fetch fails            */
/* ═══════════════════════════════════════════════════════════════════════════ */
const STATIC_FALLBACK: ShowItem[] = [
  { title: "Stranger Things",  platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/49WJfeN0moxb9IPfGn8AIqMGskD.jpg" },
  { title: "The Boys",         platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/stTEycfG9928HYGEISBFaG1ngjM.jpg" },
  { title: "Wednesday",        platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/9PFonBhy4cQy7Jz20NpMygczOkv.jpg" },
  { title: "Fallout",          platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/5YZbUmjbMa3ClvSW1Wj3D6XGkVA.jpg" },
  { title: "Squid Game",       platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg" },
  { title: "Citadel",          platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/7YPdUs60C9qQQQfOFCgxpnF07D9.jpg" },
  { title: "Outer Banks",      platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/6UQnDUoSBBCt5I4KgKxEAJjqJRR.jpg" },
  { title: "Baby Reindeer",    platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/3W4cQLRoCRYi3bWj4OYzdxG2FjJ.jpg" },
  { title: "The Grand Tour",   platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/2OfSuGGBhLqEOqgFMJiXJpfBfTu.jpg" },
];

const P_STYLE: Record<string, { color: string; label: string }> = {
  netflix: { color: "#E5192A", label: "Netflix"     },
  prime:   { color: "#00A8E1", label: "Prime Video" },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TMDB FETCH — daily trending, falls back silently                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
async function fetchTrendingShows(): Promise<ShowItem[]> {
  const key = (import.meta as any).env?.VITE_TMDB_KEY;
  if (!key) return STATIC_FALLBACK;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/tv/day?api_key=${key}&language=en-US`,
    );
    if (!res.ok) return STATIC_FALLBACK;

    const data = await res.json();
    const out: ShowItem[] = [];

    for (const show of data.results ?? []) {
      if (out.length >= 9) break;
      if (!show.poster_path) continue;
      out.push({
        title:    show.name ?? show.original_name ?? "Trending Now",
        platform: out.length % 2 === 0 ? "netflix" : "prime",
        poster:   `https://image.tmdb.org/t/p/w185${show.poster_path}`,
      });
    }

    return out.length >= 3 ? out : STATIC_FALLBACK;
  } catch {
    return STATIC_FALLBACK;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHOW SCROLLER — poster thumbnail + cycling title                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ShowScroller() {
  const [shows,   setShows]   = useState<ShowItem[]>(STATIC_FALLBACK);
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [imgOk,   setImgOk]   = useState(true);

  useEffect(() => {
    fetchTrendingShows().then((s) => { setShows(s); setIdx(0); });
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setImgOk(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % shows.length);
        setVisible(true);
      }, 360);
    }, 3800);
    return () => clearInterval(iv);
  }, [shows.length]);

  const show  = shows[idx];
  const style = P_STYLE[show.platform] ?? P_STYLE.netflix;

  return (
    <button
      onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
      aria-label={`${show.title} on ${style.label} — view plans`}
      className="group relative mx-auto flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300"
      style={{
        background:    "rgba(255,255,255,0.035)",
        border:        `1px solid ${style.color}38`,
        backdropFilter:"blur(20px)",
        padding:       0,
        height:        44,
        maxWidth:      "calc(100vw - 48px)",
      }}
    >
      {/* Circular poster */}
      <span
        className="relative flex-shrink-0"
        style={{
          width:        44,
          height:       44,
          borderRadius: "50%",
          overflow:     "hidden",
          background:   "rgba(255,255,255,0.06)",
        }}
      >
        <img
          key={show.poster}
          src={show.poster}
          alt={show.title}
          onLoad={() => setImgOk(true)}
          style={{
            width: "100%", height: "100%",
            objectFit:  "cover",
            opacity:    imgOk && visible ? 1 : 0,
            transition: "opacity 0.32s ease",
          }}
        />
        {/* Platform colour ring over poster */}
        <span
          aria-hidden
          style={{
            position:     "absolute",
            inset:        0,
            borderRadius: "50%",
            border:       `2px solid ${style.color}`,
            pointerEvents:"none",
          }}
        />
      </span>

      {/* Label + title */}
      <span
        className="flex items-center gap-2 pr-4"
        style={{ paddingLeft: 12, overflow: "hidden" }}
      >
        <span
          style={{
            fontSize:      10,
            fontWeight:    700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color:          style.color,
            flexShrink:    0,
          }}
        >
          {style.label}
        </span>
        <span
          aria-hidden
          style={{
            width:      1,
            height:     12,
            background: "rgba(255,255,255,0.12)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize:   14,
            fontWeight: 600,
            color:      "#fff",
            whiteSpace: "nowrap",
            overflow:   "hidden",
            textOverflow:"ellipsis",
            maxWidth:   "32vw",
            opacity:    visible ? 1 : 0,
            transform:  visible ? "translateY(0)" : "translateY(5px)",
            transition: "opacity 0.30s ease, transform 0.30s ease",
          }}
        >
          {show.title}
        </span>
        <span
          className="transition-transform duration-200 group-hover:translate-x-1"
          style={{ fontSize: 12, color: style.color, flexShrink: 0 }}
        >
          →
        </span>
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  WEBGL CANVAS — fallback gradient shown during Three.js load               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function HeroCanvasFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(229,25,42,0.13), transparent 70%)",
      }}
      aria-hidden
    />
  );
}

function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouse    = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const scrollY  = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;

    import("three").then((THREE) => {
      if (cancelled) return;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const W = () => mount.clientWidth;
      const H = () => mount.clientHeight;

      /* Scene */
      const scene = new THREE.Scene();
      scene.fog   = new THREE.FogExp2(0x080808, 0.04);

      const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 100);
      camera.position.set(0, 0, 7);

      const renderer = new THREE.WebGLRenderer({
        alpha:           true,
        antialias:       true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W(), H());
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      /* Soft-circle sprite */
      const sc   = document.createElement("canvas");
      sc.width   = sc.height = 64;
      const sctx = sc.getContext("2d")!;
      const sg   = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      sg.addColorStop(0,   "rgba(255,255,255,1)");
      sg.addColorStop(0.3, "rgba(255,255,255,0.5)");
      sg.addColorStop(1,   "rgba(255,255,255,0)");
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 64, 64);
      const sprite = new THREE.CanvasTexture(sc);
      sprite.colorSpace = THREE.SRGBColorSpace;

      /* Colours */
      const cRed     = new THREE.Color(0xe5192a);
      const cDeepRed = new THREE.Color(0x8b0000);
      const cGold    = new THREE.Color(0xc9a84c);
      const cWhite   = new THREE.Color(0xffffff);

      /* ── Layer 1: outer field — 62% red dominant ── */
      const PCOUNT    = reduced ? 600 : 2200;
      const positions = new Float32Array(PCOUNT * 3);
      const colors    = new Float32Array(PCOUNT * 3);
      const sizes     = new Float32Array(PCOUNT);

      for (let i = 0; i < PCOUNT; i++) {
        const layer  = Math.random();
        const radius = 1.5 + layer * 10;
        const theta  = Math.random() * Math.PI * 2;
        const phi    = Math.acos(2 * Math.random() - 1);
        positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5;
        positions[i * 3 + 2] = radius * Math.cos(phi) - 1;

        const r   = Math.random();
        const col =
          r < 0.62 ? cRed :
          r < 0.78 ? cDeepRed :
          r < 0.92 ? cGold :
          cWhite;
        colors[i * 3]     = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        sizes[i] = 0.5 + Math.random() * 2.8;
      }

      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pGeom.setAttribute("color",    new THREE.BufferAttribute(colors,    3));
      pGeom.setAttribute("size",     new THREE.BufferAttribute(sizes,     1));

      const pMat = new THREE.PointsMaterial({
        size:            0.07,
        map:             sprite,
        vertexColors:    true,
        transparent:     true,
        opacity:         0.88,
        depthWrite:      false,
        blending:        THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      /* ── Layer 2: dense core — 75% red ── */
      const CORE = reduced ? 80 : 320;
      const cPos = new Float32Array(CORE * 3);
      const cCol = new Float32Array(CORE * 3);

      for (let i = 0; i < CORE; i++) {
        const r2 = 0.3 + Math.random() * 1.8;
        const t2 = Math.random() * Math.PI * 2;
        const p2 = Math.acos(2 * Math.random() - 1);
        cPos[i * 3]     = r2 * Math.sin(p2) * Math.cos(t2);
        cPos[i * 3 + 1] = r2 * Math.sin(p2) * Math.sin(t2) * 0.4;
        cPos[i * 3 + 2] = r2 * Math.cos(p2);
        const cc = Math.random() < 0.75 ? cRed : cGold;
        cCol[i * 3]     = cc.r;
        cCol[i * 3 + 1] = cc.g;
        cCol[i * 3 + 2] = cc.b;
      }

      const coreGeom = new THREE.BufferGeometry();
      coreGeom.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
      coreGeom.setAttribute("color",    new THREE.BufferAttribute(cCol, 3));

      const coreMat = new THREE.PointsMaterial({
        size:            0.12,
        map:             sprite,
        vertexColors:    true,
        transparent:     true,
        opacity:         0.95,
        depthWrite:      false,
        blending:        THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const core = new THREE.Points(coreGeom, coreMat);
      scene.add(core);

      /* ── Layer 3: nebula rings ── */
      const rings: InstanceType<typeof THREE.Line>[] = [];
      for (let r = 0; r < 2; r++) {
        const ringPts = 180;
        const rPos    = new Float32Array(ringPts * 3);
        const radius2 = 2.5 + r * 1.8;
        for (let i = 0; i < ringPts; i++) {
          const a      = (i / ringPts) * Math.PI * 2;
          rPos[i * 3]     = radius2 * Math.cos(a);
          rPos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
          rPos[i * 3 + 2] = radius2 * Math.sin(a) * 0.35;
        }
        const rg  = new THREE.BufferGeometry();
        rg.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
        const rm  = new THREE.LineBasicMaterial({
          color:       r === 0 ? 0xe5192a : 0xc9a84c,
          transparent: true,
          opacity:     r === 0 ? 0.22 : 0.11,
          blending:    THREE.AdditiveBlending,
        });
        const ring = new THREE.Line(rg, rm);
        ring.rotation.x = Math.PI / 2 + r * 0.3;
        scene.add(ring);
        rings.push(ring);
      }

      /* ── Listeners ── */
      const onMouse = (e: MouseEvent) => {
        const rect = mount.getBoundingClientRect();
        mouse.current.tx =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.current.ty = -(((e.clientY - rect.top)  / rect.height) * 2 - 1);
      };
      const onTouch = (e: TouchEvent) => {
        if (!e.touches[0]) return;
        const rect = mount.getBoundingClientRect();
        mouse.current.tx =  ((e.touches[0].clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.current.ty = -(((e.touches[0].clientY - rect.top)  / rect.height) * 2 - 1);
      };
      const onScroll = () => (scrollY.current = window.scrollY);
      const onResize = () => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
      };
      window.addEventListener("mousemove",  onMouse);
      window.addEventListener("touchmove",  onTouch,  { passive: true });
      window.addEventListener("scroll",     onScroll, { passive: true });
      window.addEventListener("resize",     onResize);

      /* ── Render loop ── */
      const clock = new THREE.Clock();
      let raf = 0;
      let vis = true;
      const onVis = () => (vis = document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onVis);

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!vis) return;

        const dt = Math.min(clock.getDelta(), 0.05);
        const t  = clock.elapsedTime;

        mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.035;
        mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.035;

        camera.position.x += (mouse.current.x * 0.7 - camera.position.x) * 0.04;
        camera.position.y += (mouse.current.y * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        /* Faster rotation */
        points.rotation.y += dt * 0.065;
        points.rotation.x  = Math.sin(t * 0.14) * 0.07;
        core.rotation.y   -= dt * 0.13;
        core.rotation.z    = Math.sin(t * 0.18) * 0.06;

        rings.forEach((ring, i) => {
          ring.rotation.z += dt * (i === 0 ? 0.05 : -0.036);
          (ring.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity =
            (i === 0 ? 0.22 : 0.11) + Math.sin(t * 0.5 + i) * 0.06;
        });

        pMat.opacity    = 0.72 + Math.sin(t * 0.6)     * 0.16;
        coreMat.opacity = 0.88 + Math.sin(t * 0.9 + 1) * 0.12;

        const sc2 = Math.min(scrollY.current / (window.innerHeight * 0.9), 1);
        renderer.domElement.style.opacity = String(1 - sc2 * 0.95);
        camera.position.z = 7 + sc2 * 5;

        renderer.render(scene, camera);
      };
      tick();

      /* ── Cleanup ── */
      const cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("mousemove",  onMouse);
        window.removeEventListener("touchmove",  onTouch);
        window.removeEventListener("scroll",     onScroll);
        window.removeEventListener("resize",     onResize);
        renderer.dispose();
        pGeom.dispose();    pMat.dispose();
        coreGeom.dispose(); coreMat.dispose();
        sprite.dispose();
        rings.forEach((r) => {
          r.geometry.dispose();
          (r.material as THREE.Material).dispose();
        });
        if (renderer.domElement.parentNode === mount)
          mount.removeChild(renderer.domElement);
      };
      (mount as any).__threeCleanup = cleanup;
    });

    return () => {
      cancelled = true;
      (mountRef.current as any)?.__threeCleanup?.();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CURSOR SPOTLIGHT                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let tx = x, ty = y;
    const move = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", move);
    let raf = 0;
    const loop = () => {
      x  += (tx - x) * 0.06;
      y  += (ty - y) * 0.06;
      el.style.background =
        `radial-gradient(700px circle at ${x}px ${y}px, rgba(229,25,42,0.09), transparent 55%)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 4, mixBlendMode: "screen" }}
      aria-hidden
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AVATARS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
const AVATARS = [
  { bg: "#1a2744", letters: "JM" },
  { bg: "#2d1810", letters: "TC" },
  { bg: "#1a2d1a", letters: "NB" },
  { bg: "#2d1a2d", letters: "MP" },
  { bg: "#1a1a2d", letters: "SK" },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HERO3D — MAIN EXPORT                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function Hero3D() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [scrolled,    setScrolled]    = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ count: o }, { count: s }] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gt("expires_at", new Date().toISOString()),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gt("end_date", new Date().toISOString()),
      ]);
      setActiveCount(Math.max(o ?? 0, s ?? 0));
    };
    load();
    const iv = setInterval(load, 30_000);

    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });

    // Defer canvas one frame so text paints first
    const t = setTimeout(() => setCanvasReady(true), 0);

    return () => {
      clearInterval(iv);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  /* ── Animation variants ──────────────────────────────────────────────── */
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        // 0.6s delay before first child, 0.22s between each
        // Full sequence takes ~3.5s — builds tension before CTA appears
        staggerChildren: 0.22,
        delayChildren:   0.60,
      },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: {
      opacity: 1, y: 0,
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as any },
    },
  };

  // Headline is the emotional centrepiece — slowest, heaviest entrance
  const headlineVariant: Variants = {
    hidden: { opacity: 0, y: 48 },
    show: {
      opacity: 1, y: 0,
      transition: { duration: 1.4, ease: [0.12, 1, 0.2, 1] as any },
    },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", minHeight: 640, background: "#080808" }}
    >
      {/* ── 3D canvas ── */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {canvasReady ? <HeroCanvas /> : <HeroCanvasFallback />}
      </div>

      {/* ── Cursor spotlight (desktop only) ── */}
      <CursorSpotlight />

      {/* ── Film grain ── */}
      <div
        className="pointer-events-none absolute inset-0 hero-grain"
        style={{ zIndex: 3, opacity: 0.04 }}
        aria-hidden
      />

      {/* ── Radial vignette ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex:     5,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,8,8,0.75) 100%)",
        }}
        aria-hidden
      />

      {/* ── Top edge fade ── */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-full"
        style={{ zIndex: 6, height: 140, background: "linear-gradient(#080808, transparent)" }}
        aria-hidden
      />

      {/* ── Bottom edge fade ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{ zIndex: 6, height: 320, background: "linear-gradient(transparent, #080808)" }}
        aria-hidden
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  CONTENT                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6"
        style={{ zIndex: 10 }}
        initial="hidden"
        animate="show"
        variants={container}
      >
        <div className="mx-auto w-full max-w-[920px]">

          {/* ── 1. Live pill ── */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2"
              style={{
                background:    "rgba(255,255,255,0.04)",
                backdropFilter:"blur(24px) saturate(180%)",
                border:        "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width:      6,
                  height:     6,
                  borderRadius:"50%",
                  background: "#E5192A",
                  display:    "inline-block",
                  animation:  "hero-dot-pulse 2s ease infinite",
                }}
              />
              <span
                style={{
                  fontSize:      12,
                  fontWeight:    600,
                  color:         "rgba(255,255,255,0.65)",
                  letterSpacing: "0.4px",
                }}
              >
                🇿🇲 Zambia's streaming platform
              </span>
              <span
                style={{
                  background:   "rgba(229,25,42,0.10)",
                  border:       "1px solid rgba(229,25,42,0.22)",
                  borderRadius: 999,
                  padding:      "3px 10px",
                  fontSize:     11,
                  fontWeight:   700,
                  color:        "#E5192A",
                }}
              >
                {activeCount ?? "—"} live
              </span>
            </div>
          </motion.div>

          {/* ── 2. Show scroller ── */}
          <motion.div variants={fadeUp} className="mt-5 flex justify-center">
            <ShowScroller />
          </motion.div>

          {/* ── 3. HEADLINE ── */}
          {/*
              Font scales purely from viewport width.
              7.8vw base = ~30px on 390px phone, fits "ENTERTAINMENT" in one line.
              Caps at 100px on wide screens.
              Letter-spacing uses em so it scales proportionally.
          */}
          <motion.h1
            variants={headlineVariant}
            className="mt-8 font-display w-full"
            style={{
              fontSize:      "clamp(7.8vw, 8.8vw, 100px)",
              fontWeight:    900,
              letterSpacing: "clamp(-0.5px, -0.025em, -3px)",
              lineHeight:    0.95,
              color:         "#FFFFFF",
            }}
          >
            <span className="block">Entertainment</span>
            <span className="block mt-1">
              <span style={{ color: "#FFFFFF" }}>you </span>
              {/* "deserve" — pure red, clean, no gradient */}
              <span style={{ color: "#E5192A" }}>deserve</span>
              <span style={{ color: "#E5192A" }}>.</span>
            </span>
          </motion.h1>

          {/* ── 4. Subheadline ── */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-7"
            style={{
              fontSize:   "clamp(14px, 1.4vw, 18px)",
              fontWeight: 400,
              color:      "rgba(255,255,255,0.42)",
              maxWidth:   460,
              lineHeight: 1.75,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Netflix</span>.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Prime Video</span>. Both.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>No card</span>. Via{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>WhatsApp</span>. In 15 minutes.
          </motion.p>

          {/* ── 5. Trust pills ── */}
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-2">
            {["⚡ 15-min activation", "🔒 No card required", "✓ 2-day free trial"].map((t) => (
              <span
                key={t}
                className="hero-trust-pill"
                style={{
                  background:   "rgba(255,255,255,0.06)",
                  border:       "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 999,
                  padding:      "7px 16px",
                  fontSize:     12,
                  fontWeight:   500,
                  color:        "rgba(255,255,255,0.65)",
                }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          {/* ── 6. CTAs ── */}
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="/trial" className="hero-btn-primary">
              <span style={{ position: "relative", zIndex: 1 }}>Start Free Trial</span>
              <span className="hero-btn-arrow" style={{ position: "relative", zIndex: 1 }}>→</span>
            </a>
            <a
              href="#plans"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-btn-secondary"
            >
              See Plans ↓
            </a>
          </motion.div>

          {/* ── 7. Social proof ── */}
          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((a) => (
                <div
                  key={a.letters}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#080808] text-[10px] font-bold text-white"
                  style={{ background: a.bg }}
                >
                  {a.letters}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              {activeCount ? `${activeCount} streaming right now` : "Trusted across Zambia"}
            </span>
          </motion.div>

        </div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          bottom:     40,
          zIndex:     10,
          opacity:    scrolled ? 0 : 1,
          transition: "opacity 500ms",
        }}
      >
        <span
          style={{
            display:         "block",
            width:           1,
            height:          52,
            background:      "rgba(255,255,255,0.18)",
            transformOrigin: "top",
            animation:       "hero-scroll-line 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.18)",
          }}
        >
          scroll
        </span>
      </div>

      {/* ── Scoped keyframes ── */}
      <style>{`
        @keyframes hero-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(229,25,42,0); }
        }
        @keyframes hero-scroll-line {
          0%   { transform: scaleY(0); opacity: 0.5; }
          50%  { transform: scaleY(1); opacity: 1;   }
          100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
        }
        .hero-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: overlay;
        }
        .hero-trust-pill {
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .hero-trust-pill:hover {
          border-color: rgba(255,255,255,0.14) !important;
          background: rgba(255,255,255,0.09) !important;
          transform: translateY(-2px);
        }
        .hero-btn-primary {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; gap: 8px;
          background: #E5192A; border: none; border-radius: 999px;
          padding: 17px 38px; font-size: 15px; font-weight: 700;
          color: #fff; cursor: pointer; text-decoration: none;
          letter-spacing: 0.2px;
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
          box-shadow: 0 0 32px -8px rgba(229,25,42,0.55);
        }
        .hero-btn-primary::before {
          content: ""; position: absolute;
          top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 550ms ease;
        }
        .hero-btn-primary:hover {
          background: #FF1F33;
          transform: scale(1.04) translateY(-1px);
          box-shadow: 0 0 0 1px rgba(229,25,42,0.3),
                      0 10px 30px rgba(229,25,42,0.45),
                      0 28px 56px rgba(229,25,42,0.22);
        }
        .hero-btn-primary:hover::before { left: 150%; }
        .hero-btn-primary:hover .hero-btn-arrow { transform: translateX(5px); }
        .hero-btn-arrow { transition: transform 220ms ease; }
        .hero-btn-secondary {
          display: inline-flex; align-items: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 999px; padding: 16px 28px;
          font-size: 15px; font-weight: 500;
          color: rgba(255,255,255,0.65); text-decoration: none;
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .hero-btn-secondary:hover {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.07);
          color: #fff; transform: translateY(-2px);
        }
      `}</style>
    </section>
  );
}
