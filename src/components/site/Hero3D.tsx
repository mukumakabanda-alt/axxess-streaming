import { useEffect, useRef, useState, useCallback } from "react";
import { motion, type Variants, useMotionValue, useSpring } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
type ShowItem = {
  title:    string;
  platform: "netflix" | "prime";
  poster:   string;
  rating?:  string;
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  STATIC FALLBACK                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
const STATIC_FALLBACK: ShowItem[] = [
  { title: "Stranger Things",  platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: "8.7" },
  { title: "The Boys",         platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/stTEycfG9928HYGEISBFaG1ngjM.jpg", rating: "8.7" },
  { title: "Wednesday",        platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", rating: "8.1" },
  { title: "Fallout",          platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/5YZbUmjbMa3ClvSW1Wj3D6XGkVA.jpg", rating: "8.5" },
  { title: "Squid Game",       platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", rating: "8.0" },
  { title: "Citadel",          platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/7YPdUs60C9qQQQfOFCgxpnF07D9.jpg", rating: "6.8" },
  { title: "Outer Banks",      platform: "netflix", poster: "https://image.tmdb.org/t/p/w185/6UQnDUoSBBCt5I4KgKxEAJjqJRR.jpg", rating: "7.6" },
  { title: "Reacher",          platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/pnXLFiDTwOAHDdZwuMCtEBknFhF.jpg", rating: "8.0" },
  { title: "Invincible",       platform: "prime",   poster: "https://image.tmdb.org/t/p/w185/yDWJYRAwMNKa8j2KqM1j3gMRFBl.jpg", rating: "8.7" },
];

const P_STYLE: Record<string, { color: string; label: string; glow: string }> = {
  netflix: { color: "#E5192A", label: "Netflix",     glow: "rgba(229,25,42,0.35)" },
  prime:   { color: "#00A8E1", label: "Prime Video", glow: "rgba(0,168,225,0.35)" },
};

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
        rating:   show.vote_average ? show.vote_average.toFixed(1) : undefined,
      });
    }
    return out.length >= 3 ? out : STATIC_FALLBACK;
  } catch {
    return STATIC_FALLBACK;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHOW SCROLLER                                                              */
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
      }, 380);
    }, 4000);
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
        background:     "rgba(255,255,255,0.04)",
        border:         `1px solid ${style.color}30`,
        backdropFilter: "blur(24px)",
        padding:        0,
        height:         44,
        maxWidth:       "calc(100vw - 48px)",
        boxShadow:      `0 0 20px -6px ${style.glow}`,
        transition:     "box-shadow 0.4s ease, border-color 0.4s ease",
      }}
    >
      {/* Poster circle */}
      <span
        className="relative flex-shrink-0"
        style={{
          width: 44, height: 44,
          borderRadius: "50%",
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <img
          key={show.poster}
          src={show.poster}
          alt={show.title}
          onLoad={() => setImgOk(true)}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity:   imgOk && visible ? 1 : 0,
            transition: "opacity 0.36s ease",
          }}
        />
        <span aria-hidden style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `2px solid ${style.color}`,
          pointerEvents: "none",
        }} />
      </span>

      {/* Label + title + rating */}
      <span className="flex items-center gap-2 pr-4" style={{ paddingLeft: 12, overflow: "hidden" }}>
        <span style={{
          fontSize: 9, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.15em",
          color: style.color, flexShrink: 0,
        }}>
          {style.label}
        </span>
        <span aria-hidden style={{ width: 1, height: 10, background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: "#fff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "28vw",
          opacity:   visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.32s ease, transform 0.32s ease",
        }}>
          {show.title}
        </span>
        {show.rating && (
          <>
            <span aria-hidden style={{ width: 1, height: 10, background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: "#F5C518", flexShrink: 0,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.32s ease",
            }}>
              ★ {show.rating}
            </span>
          </>
        )}
        <span className="transition-transform duration-200 group-hover:translate-x-1"
          style={{ fontSize: 11, color: style.color, flexShrink: 0 }}>
          →
        </span>
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PORTAL GLOW — the glowing door/gateway at scene centre                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function PortalGlow() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{
        zIndex: 1,
        top: "8%",
        width: "clamp(200px, 38vw, 520px)",
        height: "clamp(340px, 62vh, 780px)",
      }}
      aria-hidden
    >
      {/* Outer diffuse glow */}
      <div style={{
        position: "absolute", inset: "-40%",
        background: "radial-gradient(ellipse 55% 70% at 50% 48%, rgba(229,25,42,0.22) 0%, rgba(160,10,20,0.10) 45%, transparent 75%)",
        animation: "portal-breathe 3.5s ease-in-out infinite",
      }} />

      {/* Portal door frame — the rectangle */}
      <div style={{
        position: "absolute",
        top: "12%", left: "20%", right: "20%", bottom: "5%",
        border: "1.5px solid rgba(229,25,42,0.55)",
        borderRadius: 4,
        boxShadow: `
          0 0 12px 2px rgba(229,25,42,0.35),
          0 0 40px 8px rgba(229,25,42,0.18),
          inset 0 0 20px rgba(229,25,42,0.08)
        `,
        background: "linear-gradient(180deg, rgba(229,25,42,0.04) 0%, rgba(255,80,50,0.02) 100%)",
        animation: "portal-flicker 4s ease-in-out infinite",
      }}>
        {/* Door inner highlight */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(229,25,42,0.9), rgba(255,120,80,1), rgba(229,25,42,0.9), transparent)",
          boxShadow: "0 0 12px 4px rgba(229,25,42,0.6)",
          borderRadius: 2,
        }} />
        {/* Door inner side lights */}
        <div style={{
          position: "absolute", top: "4px", bottom: "4px", left: 0, width: "1.5px",
          background: "linear-gradient(180deg, rgba(229,25,42,0.8), rgba(229,25,42,0.3), rgba(229,25,42,0.8))",
          boxShadow: "0 0 8px rgba(229,25,42,0.5)",
        }} />
        <div style={{
          position: "absolute", top: "4px", bottom: "4px", right: 0, width: "1.5px",
          background: "linear-gradient(180deg, rgba(229,25,42,0.8), rgba(229,25,42,0.3), rgba(229,25,42,0.8))",
          boxShadow: "0 0 8px rgba(229,25,42,0.5)",
        }} />
        {/* AXXESS text on door — XX neon red */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: "clamp(8px, 1.2vw, 14px)",
          fontWeight: 900,
          letterSpacing: "0.35em",
          color: "rgba(229,25,42,0.7)",
          textShadow: "0 0 12px rgba(229,25,42,0.9), 0 0 24px rgba(229,25,42,0.5)",
          animation: "portal-flicker 3s ease-in-out infinite",
          userSelect: "none",
        }}>
          A<span style={{
            color: "#FF0000",
            textShadow: "0 0 8px #FF0000, 0 0 20px rgba(255,0,0,0.9), 0 0 40px rgba(255,0,0,0.6)",
          }}>XX</span>ESS
        </div>
      </div>

      {/* Floor glow — light pool beneath the door */}
      <div style={{
        position: "absolute",
        bottom: "-8%", left: "5%", right: "5%",
        height: "30%",
        background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(229,25,42,0.20), transparent 70%)",
        filter: "blur(8px)",
        animation: "portal-breathe 3.5s ease-in-out infinite",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SILHOUETTE FIGURE                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function SilhouetteFigure() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{
        zIndex: 3,
        bottom: "clamp(60px, 12vh, 140px)",
        width: "clamp(70px, 10vw, 130px)",
        animation: "figure-breathe 4s ease-in-out infinite",
      }}
      aria-hidden
    >
      {/* Rim/backlight glow behind figure */}
      <div style={{
        position: "absolute",
        top: "10%", left: "50%", transform: "translateX(-50%)",
        width: "140%", height: "85%",
        background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(229,25,42,0.28) 0%, transparent 70%)",
        filter: "blur(10px)",
      }} />
      {/* SVG silhouette — hoodie figure, back to viewer */}
      <svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", filter: "drop-shadow(0 0 14px rgba(229,25,42,0.5))" }}>
        {/* Head */}
        <ellipse cx="50" cy="22" rx="13" ry="14" fill="#0a0a0a" />
        {/* Hood */}
        <path d="M28 30 Q30 8 50 6 Q70 8 72 30 Q65 26 50 26 Q35 26 28 30Z" fill="#111" />
        {/* Hoodie body */}
        <path d="M28 30 L18 85 Q17 92 22 94 L30 96 L30 185 Q30 192 50 192 Q70 192 70 185 L70 96 L78 94 Q83 92 82 85 L72 30 Q65 40 50 40 Q35 40 28 30Z" fill="#0d0d0d" />
        {/* Pocket */}
        <path d="M35 110 Q35 100 50 100 Q65 100 65 110 L65 130 Q65 135 50 135 Q35 135 35 130Z" fill="#141414" />
        {/* Shoes */}
        <ellipse cx="36" cy="190" rx="10" ry="5" fill="#111" />
        <ellipse cx="64" cy="190" rx="10" ry="5" fill="#111" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  THREE.JS PARTICLE FIELD                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
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

      const scene  = new THREE.Scene();
      scene.fog    = new THREE.FogExp2(0x060606, 0.032);

      const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 100);
      camera.position.set(0, 0, 8);

      const renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W(), H());
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      /* Sprite texture */
      const sc   = document.createElement("canvas");
      sc.width   = sc.height = 64;
      const sctx = sc.getContext("2d")!;
      const sg   = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      sg.addColorStop(0,   "rgba(255,255,255,1)");
      sg.addColorStop(0.4, "rgba(255,255,255,0.4)");
      sg.addColorStop(1,   "rgba(255,255,255,0)");
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 64, 64);
      const sprite = new THREE.CanvasTexture(sc);
      sprite.colorSpace = THREE.SRGBColorSpace;

      const cRed     = new THREE.Color(0xe5192a);
      const cDeepRed = new THREE.Color(0x8b0000);
      const cOrange  = new THREE.Color(0xff5020);
      const cGold    = new THREE.Color(0xc9a84c);
      const cWhite   = new THREE.Color(0xffffff);

      /* Outer field */
      const PCOUNT    = reduced ? 800 : 2800;
      const positions = new Float32Array(PCOUNT * 3);
      const colors    = new Float32Array(PCOUNT * 3);
      const sizes     = new Float32Array(PCOUNT);

      for (let i = 0; i < PCOUNT; i++) {
        const layer  = Math.random();
        const radius = 2 + layer * 12;
        const theta  = Math.random() * Math.PI * 2;
        const phi    = Math.acos(2 * Math.random() - 1);
        positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.45;
        positions[i * 3 + 2] = radius * Math.cos(phi) - 2;
        const r   = Math.random();
        const col = r < 0.58 ? cRed : r < 0.72 ? cDeepRed : r < 0.82 ? cOrange : r < 0.93 ? cGold : cWhite;
        colors[i * 3]     = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        sizes[i] = 0.4 + Math.random() * 2.6;
      }

      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pGeom.setAttribute("color",    new THREE.BufferAttribute(colors,    3));
      pGeom.setAttribute("size",     new THREE.BufferAttribute(sizes,     1));

      const pMat = new THREE.PointsMaterial({
        size: 0.065, map: sprite, vertexColors: true,
        transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      });
      const points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      /* Core cluster */
      const CORE = reduced ? 100 : 400;
      const cPos = new Float32Array(CORE * 3);
      const cCol = new Float32Array(CORE * 3);
      for (let i = 0; i < CORE; i++) {
        const r2 = 0.2 + Math.random() * 2.0;
        const t2 = Math.random() * Math.PI * 2;
        const p2 = Math.acos(2 * Math.random() - 1);
        cPos[i * 3]     = r2 * Math.sin(p2) * Math.cos(t2);
        cPos[i * 3 + 1] = r2 * Math.sin(p2) * Math.sin(t2) * 0.4;
        cPos[i * 3 + 2] = r2 * Math.cos(p2);
        const cc = Math.random() < 0.70 ? cRed : Math.random() < 0.5 ? cOrange : cGold;
        cCol[i * 3]     = cc.r;
        cCol[i * 3 + 1] = cc.g;
        cCol[i * 3 + 2] = cc.b;
      }
      const coreGeom = new THREE.BufferGeometry();
      coreGeom.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
      coreGeom.setAttribute("color",    new THREE.BufferAttribute(cCol, 3));
      const coreMat = new THREE.PointsMaterial({
        size: 0.11, map: sprite, vertexColors: true,
        transparent: true, opacity: 0.92,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      });
      const core = new THREE.Points(coreGeom, coreMat);
      scene.add(core);

      /* Nebula rings */
      const rings: InstanceType<typeof THREE.Line>[] = [];
      for (let r = 0; r < 3; r++) {
        const ringPts = 220;
        const rPos    = new Float32Array(ringPts * 3);
        const radius2 = 2.2 + r * 1.6;
        for (let i = 0; i < ringPts; i++) {
          const a = (i / ringPts) * Math.PI * 2;
          rPos[i * 3]     = radius2 * Math.cos(a);
          rPos[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
          rPos[i * 3 + 2] = radius2 * Math.sin(a) * 0.3;
        }
        const rg = new THREE.BufferGeometry();
        rg.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
        const rm = new THREE.LineBasicMaterial({
          color:       r === 0 ? 0xe5192a : r === 1 ? 0xff5020 : 0xc9a84c,
          transparent: true,
          opacity:     r === 0 ? 0.18 : r === 1 ? 0.10 : 0.07,
          blending:    THREE.AdditiveBlending,
        });
        const ring = new THREE.Line(rg, rm);
        ring.rotation.x = Math.PI / 2 + r * 0.25;
        scene.add(ring);
        rings.push(ring);
      }

      /* Listeners */
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

        mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.032;
        mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.032;

        camera.position.x += (mouse.current.x * 0.8  - camera.position.x) * 0.038;
        camera.position.y += (mouse.current.y * 0.45 - camera.position.y) * 0.038;
        camera.lookAt(0, 0, 0);

        points.rotation.y += dt * 0.055;
        points.rotation.x  = Math.sin(t * 0.12) * 0.06;
        core.rotation.y   -= dt * 0.11;
        core.rotation.z    = Math.sin(t * 0.16) * 0.05;

        rings.forEach((ring, i) => {
          ring.rotation.z += dt * (i === 0 ? 0.045 : i === 1 ? -0.032 : 0.018);
          (ring.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity =
            (i === 0 ? 0.18 : i === 1 ? 0.10 : 0.07) + Math.sin(t * 0.6 + i) * 0.05;
        });

        pMat.opacity    = 0.68 + Math.sin(t * 0.55) * 0.17;
        coreMat.opacity = 0.85 + Math.sin(t * 0.85 + 1) * 0.12;

        const sc2 = Math.min(scrollY.current / (window.innerHeight * 0.85), 1);
        renderer.domElement.style.opacity = String(1 - sc2 * 0.95);
        camera.position.z = 8 + sc2 * 6;

        renderer.render(scene, camera);
      };
      tick();

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
          (r.material as { dispose: () => void }).dispose();
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
      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      el.style.background =
        `radial-gradient(800px circle at ${x}px ${y}px, rgba(229,25,42,0.07), transparent 50%)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={ref}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 4, mixBlendMode: "screen" }}
      aria-hidden />
  );
}

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
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("status", "completed").gt("expires_at", new Date().toISOString()),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("is_active", true).gt("end_date", new Date().toISOString()),
      ]);
      setActiveCount(Math.max(o ?? 0, s ?? 0));
    };
    load();
    const iv = setInterval(load, 30_000);
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(() => setCanvasReady(true), 0);
    return () => { clearInterval(iv); window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  /* Framer variants — cinematic, smooth pacing */
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.30, delayChildren: 0.80 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] as any } },
  };
  const headlineVariant: Variants = {
    hidden: { opacity: 0, y: 64, filter: "blur(12px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.8, ease: [0.12, 1, 0.2, 1] as any } },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", minHeight: 640, background: "#060606" }}
    >
      {/* ── 3D particle canvas ── */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {canvasReady && <HeroCanvas />}
      </div>

      {/* ── Portal door glow ── */}
      <PortalGlow />

      {/* ── Silhouette figure ── */}
      <SilhouetteFigure />

      {/* ── Cursor spotlight ── */}
      <CursorSpotlight />

      {/* ── Film grain ── */}
      <div
        className="pointer-events-none absolute inset-0 hero-grain"
        style={{ zIndex: 5, opacity: 0.035 }}
        aria-hidden
      />

      {/* ── Radial vignette ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 6,
          background: "radial-gradient(ellipse at center, transparent 25%, rgba(6,6,6,0.82) 100%)",
        }}
        aria-hidden
      />

      {/* ── Top fade ── */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-full"
        style={{ zIndex: 7, height: 160, background: "linear-gradient(#060606 0%, transparent 100%)" }}
        aria-hidden
      />

      {/* ── Bottom fade ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{ zIndex: 7, height: 360, background: "linear-gradient(transparent 0%, rgba(6,6,6,0.96) 70%, #060606 100%)" }}
        aria-hidden
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  CONTENT                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-end px-4 text-center sm:px-6"
        style={{ zIndex: 10, paddingBottom: "clamp(72px, 10vh, 120px)" }}
        initial="hidden"
        animate="show"
        variants={container}
      >
        <div className="mx-auto w-full max-w-[900px]">

          {/* ── 1. Live counter pill ── */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2"
              style={{
                background:     "rgba(255,255,255,0.04)",
                backdropFilter: "blur(28px) saturate(180%)",
                border:         "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span aria-hidden style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#E5192A", display: "inline-block",
                animation: "hero-dot-pulse 2s ease infinite",
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: "rgba(255,255,255,0.60)", letterSpacing: "0.3px",
              }}>
                {activeCount ? `${activeCount.toLocaleString()} subscribers streaming now` : "Subscribers streaming now"}
              </span>
              <span style={{
                background: "rgba(229,25,42,0.12)",
                border: "1px solid rgba(229,25,42,0.25)",
                borderRadius: 999, padding: "3px 10px",
                fontSize: 11, fontWeight: 700, color: "#E5192A",
              }}>
                {activeCount ?? "—"} live
              </span>
            </div>
          </motion.div>

          {/* ── 2. Show scroller ── */}
          <motion.div variants={fadeUp} className="mt-5 flex justify-center">
            <ShowScroller />
          </motion.div>

          {/* ── 3. HEADLINE ── */}
          <motion.h1
            variants={headlineVariant}
            className="mt-7 font-display w-full"
            style={{
              fontSize:      "clamp(48px, 7.8vw, 96px)",
              fontWeight:    900,
              letterSpacing: "clamp(-1px, -0.025em, -3px)",
              lineHeight:    0.93,
              color:         "#FFFFFF",
            }}
          >
            <span className="block">Every World.</span>
            <span className="block mt-1">
              <span style={{ color: "#FFFFFF" }}>One </span>
              <span style={{
                color: "#E5192A",
                textShadow: "0 0 40px rgba(229,25,42,0.6), 0 0 80px rgba(229,25,42,0.3)",
              }}>
                A<span style={{
                  color: "#FF0000",
                  textShadow: "0 0 16px #FF0000, 0 0 40px rgba(255,0,0,0.9), 0 0 80px rgba(255,0,0,0.5)",
                }}>XX</span>ESS.
              </span>
            </span>
          </motion.h1>

          {/* ── 4. Subheadline ── */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6"
            style={{
              fontSize: "clamp(14px, 1.3vw, 17px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.40)",
              maxWidth: 440,
              lineHeight: 1.8,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Netflix</span>.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Prime Video</span>. Both.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>No card</span>. Via{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>WhatsApp</span>. In 15 minutes.
          </motion.p>

          {/* ── 5. Trust pills ── */}
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-2">
            {["⚡ 15-min activation", "🔒 No card required", "✓ No contract"].map((t) => (
              <span
                key={t}
                className="hero-trust-pill"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 999, padding: "7px 16px",
                  fontSize: 12, fontWeight: 500,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          {/* ── 6. SINGLE CTA: See Plans ── */}
          <motion.div variants={fadeUp} className="mt-8 flex justify-center">
            <a
              href="#plans"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-btn-primary"
            >
              <span style={{ position: "relative", zIndex: 1 }}>See Plans</span>
              <span className="hero-btn-arrow" style={{ position: "relative", zIndex: 1 }}>→</span>
            </a>
          </motion.div>

        </div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          bottom: 28, zIndex: 10,
          opacity: scrolled ? 0 : 1,
          transition: "opacity 500ms",
        }}
      >
        <span style={{
          display: "block", width: 1, height: 48,
          background: "rgba(255,255,255,0.14)",
          transformOrigin: "top",
          animation: "hero-scroll-line 2.2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: 3,
          textTransform: "uppercase", color: "rgba(255,255,255,0.14)",
        }}>
          scroll
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  SCOPED KEYFRAMES + STYLES                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes hero-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.5); }
          50%       { box-shadow: 0 0 0 7px rgba(229,25,42,0); }
        }
        @keyframes hero-scroll-line {
          0%   { transform: scaleY(0); opacity: 0; transform-origin: top; }
          50%  { transform: scaleY(1); opacity: 1; transform-origin: top; }
          100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
        }
        @keyframes portal-breathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes portal-flicker {
          0%, 100% { opacity: 1; }
          92%       { opacity: 1; }
          93%       { opacity: 0.7; }
          94%       { opacity: 1; }
          97%       { opacity: 0.85; }
          98%       { opacity: 1; }
        }
        @keyframes figure-breathe {
          0%, 100% { transform: translateX(-50%) translateY(0px) scale(1); }
          50%       { transform: translateX(-50%) translateY(-5px) scale(1.01); }
        }
        .hero-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: overlay;
        }
        .hero-trust-pill {
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .hero-trust-pill:hover {
          border-color: rgba(255,255,255,0.13) !important;
          background: rgba(255,255,255,0.08) !important;
          transform: translateY(-2px);
        }
        .hero-btn-primary {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; gap: 10px;
          background: #E5192A;
          border: none; border-radius: 999px;
          padding: 18px 44px;
          font-size: 16px; font-weight: 700;
          color: #fff; cursor: pointer; text-decoration: none;
          letter-spacing: 0.3px;
          transition: all 240ms cubic-bezier(0.25,0.46,0.45,0.94);
          box-shadow:
            0 0 0 1px rgba(229,25,42,0.3),
            0 8px 32px rgba(229,25,42,0.45),
            0 24px 64px rgba(229,25,42,0.20);
        }
        .hero-btn-primary::before {
          content: ""; position: absolute;
          top: 0; left: -100%; width: 65%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transition: left 600ms ease;
        }
        .hero-btn-primary:hover {
          background: #FF1F33;
          transform: scale(1.05) translateY(-2px);
          box-shadow:
            0 0 0 1px rgba(229,25,42,0.4),
            0 12px 40px rgba(229,25,42,0.55),
            0 32px 80px rgba(229,25,42,0.28);
        }
        .hero-btn-primary:hover::before { left: 160%; }
        .hero-btn-primary:hover .hero-btn-arrow { transform: translateX(6px); }
        .hero-btn-arrow { transition: transform 240ms ease; }
        .hero-btn-primary:active { transform: scale(0.98) translateY(0px); }
      `}</style>
    </section>
  );
    }
