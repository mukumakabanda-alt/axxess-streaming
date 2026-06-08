import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  WebGL Canvas — smoother, layered, performance-friendly             */
/* ------------------------------------------------------------------ */
function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const scrollY = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = () => mount.clientWidth;
    const h = () => mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080808, 0.06);

    const camera = new THREE.PerspectiveCamera(55, w() / h(), 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ---------- Layered particle field (Points + additive) -------- */
    const PCOUNT = prefersReduced ? 400 : 1400;
    const positions = new Float32Array(PCOUNT * 3);
    const colors = new Float32Array(PCOUNT * 3);
    const sizes = new Float32Array(PCOUNT);
    const seeds = new Float32Array(PCOUNT);

    const cRed = new THREE.Color(0xe5192a);
    const cGold = new THREE.Color(0xc9a84c);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < PCOUNT; i++) {
      // distribute on layered shells for depth
      const layer = Math.random();
      const radius = 2 + layer * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = radius * Math.cos(phi) - 1;

      const r = Math.random();
      const col = r < 0.55 ? cRed : r < 0.8 ? cGold : cWhite;
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      sizes[i] = 0.6 + Math.random() * 2.4;
      seeds[i] = Math.random() * Math.PI * 2;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    pGeom.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // soft round sprite generated on the fly
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);
    sprite.colorSpace = THREE.SRGBColorSpace;

    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);

    /* Globe/icosahedra removed — keeping only the dust particle field */


    /* ---------- Listeners ---------------------------------------- */
    const onMouse = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const r = mount.getBoundingClientRect();
      mouse.current.tx = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      mouse.current.ty = -(((e.touches[0].clientY - r.top) / r.height) * 2 - 1);
    };
    const onScroll = () => (scrollY.current = window.scrollY);
    const onResize = () => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    /* ---------- Animate (delta-time, smoother) ------------------- */
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const onVis = () => (visible = document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // smooth mouse easing
      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.04;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.04;

      // parallax camera
      const targetX = mouse.current.x * 0.6;
      const targetY = mouse.current.y * 0.35;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      // particle drift via uniform-ish per-frame position offset using rotation
      points.rotation.y += dt * 0.04;
      points.rotation.x = Math.sin(t * 0.12) * 0.08;

      // breathing scale on point material (cheap shimmer)
      pMat.opacity = 0.75 + Math.sin(t * 0.7) * 0.12;

      // (icosahedra removed)


      // scroll fade & dolly
      const scrolled = Math.min(scrollY.current / (window.innerHeight * 0.9), 1);
      renderer.domElement.style.opacity = String(1 - scrolled * 0.95);
      camera.position.z = 7 + scrolled * 4.5;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pGeom.dispose();
      pMat.dispose();
      sprite.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/*  Cursor spotlight — pure DOM, follows pointer with smooth easing    */
/* ------------------------------------------------------------------ */
function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    window.addEventListener("mousemove", move);
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(229,25,42,0.10), transparent 60%)`;
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

const AVATARS = [
  { bg: "#1a2744", letters: "JM" },
  { bg: "#2d1810", letters: "TC" },
  { bg: "#1a2d1a", letters: "NB" },
  { bg: "#2d1a2d", letters: "MP" },
  { bg: "#1a1a2d", letters: "SK" },
];

export function Hero3D() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

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
    const i = setInterval(load, 30000);
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(i);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 640, background: "#080808" }}
    >
      {/* Layer 1: canvas */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <HeroCanvas />
      </div>

      {/* Layer 1.5: cursor spotlight */}
      <CursorSpotlight />

      {/* Subtle grain */}
      <div
        className="pointer-events-none absolute inset-0 hero-grain"
        style={{ zIndex: 3, opacity: 0.05 }}
        aria-hidden
      />

      {/* Vignettes */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 5,
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(8,8,8,0.7) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute top-0 left-0 w-full"
        style={{ zIndex: 6, height: 120, background: "linear-gradient(#080808, transparent)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{ zIndex: 6, height: 280, background: "linear-gradient(transparent, #080808)" }}
      />

      {/* Layer 2: content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ zIndex: 10 }}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
      >
        <div className="mx-auto w-full max-w-[900px]">
          {/* Location pill */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="relative inline-block"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#E5192A",
                  animation: "hero-dot-pulse 2s ease infinite",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.5px",
                }}
              >
                🇿🇲 Zambia's streaming platform
              </span>
              <span
                style={{
                  background: "rgba(229,25,42,0.12)",
                  border: "1px solid rgba(229,25,42,0.25)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#E5192A",
                }}
              >
                {activeCount ?? "—"} live
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mt-8 font-display"
            style={{
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 900,
              letterSpacing: "-3px",
              lineHeight: 0.95,
              color: "#FFFFFF",
            }}
          >
            <span className="block">Entertainment</span>
            <span className="block">
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #E5192A 0%, #FF4D5E 40%, #C9A84C 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "hero-shimmer 4s ease-in-out infinite alternate",
                }}
              >
                you deserve
              </span>
              <span style={{ color: "#E5192A" }}>.</span>
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6"
            style={{
              fontSize: "clamp(16px, 1.5vw, 20px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.45)",
              maxWidth: 480,
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Netflix</span>.{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Prime Video</span>. Both.{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>No card</span>. Via{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>WhatsApp</span>. In 15 minutes.
          </motion.p>

          {/* Trust pills */}
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-2.5">
            {["⚡ 15-min activation", "🔒 No card required", "✓ 2-day free trial"].map((t) => (
              <span
                key={t}
                className="hero-trust-pill"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
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

          {/* Social proof */}
          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-4">
            <div className="flex">
              {AVATARS.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: a.bg,
                    border: "2px solid #080808",
                    marginLeft: i === 0 ? 0 : -10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {a.letters}
                </motion.div>
              ))}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Joined by{" "}
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                {activeCount ?? "—"}
              </span>{" "}
              in Zambia
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ bottom: 40, zIndex: 10, opacity: scrolled ? 0 : 1, transition: "opacity 400ms" }}
      >
        <span
          style={{
            display: "block",
            width: 1,
            height: 48,
            background: "rgba(255,255,255,0.2)",
            transformOrigin: "top",
            animation: "hero-scroll-line 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          scroll
        </span>
      </div>

      <style>{`
        @keyframes hero-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(229,25,42,0); }
        }
        @keyframes hero-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes hero-scroll-line {
          0% { transform: scaleY(0); opacity: 0.6; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
        }
        .hero-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: overlay;
        }
        .hero-trust-pill { transition: all 200ms cubic-bezier(0.25,0.46,0.45,0.94); }
        .hero-trust-pill:hover {
          border-color: rgba(255,255,255,0.12) !important;
          background: rgba(255,255,255,0.10) !important;
          transform: translateY(-2px);
        }
        .hero-btn-primary {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #E5192A;
          border: none;
          border-radius: 999px;
          padding: 16px 36px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: all 200ms cubic-bezier(0.25,0.46,0.45,0.94);
          text-decoration: none;
        }
        .hero-btn-primary::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 500ms ease;
        }
        .hero-btn-primary:hover {
          background: #FF1F33;
          transform: scale(1.03);
          box-shadow:
            0 0 0 1px rgba(229,25,42,0.3),
            0 8px 24px rgba(229,25,42,0.4),
            0 24px 48px rgba(229,25,42,0.2);
        }
        .hero-btn-primary:hover::before { left: 150%; }
        .hero-btn-primary:hover .hero-btn-arrow { transform: translateX(4px); }
        .hero-btn-arrow { transition: transform 200ms ease; }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          padding: 15px 28px;
          font-size: 15px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          transition: all 200ms cubic-bezier(0.25,0.46,0.45,0.94);
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          border-color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.08);
          color: #fff;
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  );
}
