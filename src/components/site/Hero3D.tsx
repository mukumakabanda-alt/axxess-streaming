import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  AI Title Scroller — fetches trending titles, routes on click       */
/* ------------------------------------------------------------------ */
const STATIC_TITLES = [
  { title: "Stranger Things", platform: "netflix" },
  { title: "The Boys", platform: "prime" },
  { title: "Wednesday", platform: "netflix" },
  { title: "Reginald the Vampire", platform: "dstv" },
  { title: "Fallout", platform: "prime" },
  { title: "Squid Game", platform: "netflix" },
  { title: "The Grand Tour", platform: "prime" },
  { title: "Shaka iLembe", platform: "dstv" },
  { title: "Baby Reindeer", platform: "netflix" },
  { title: "Citadel", platform: "prime" },
  { title: "Africa Magic", platform: "dstv" },
  { title: "Outer Banks", platform: "netflix" },
];

const PLATFORM_STYLES: Record<string, { color: string; label: string }> = {
  netflix: { color: "#E5192A", label: "Netflix" },
  prime:   { color: "#00A8E1", label: "Prime Video" },
  dstv:    { color: "#C9A84C", label: "DStv" },
};

function AITitleScroller() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((i) => (i + 1) % STATIC_TITLES.length);
        setVisible(true);
      }, 400);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const current = STATIC_TITLES[active];
  const style = PLATFORM_STYLES[current.platform];

  const handleClick = () => {
    if (current.platform === "dstv") {
      window.location.href = "/reserve";
    } else {
      const el = document.getElementById("plans");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="group relative mx-auto flex items-center gap-3 overflow-hidden rounded-full px-5 py-2.5 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${style.color}40`,
        backdropFilter: "blur(20px)",
      }}
      aria-label={`View ${current.title} on ${style.label}`}
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: style.color }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: style.color }}
        />
      </span>
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: style.color }}
      >
        {style.label}
      </span>
      <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />
      <span
        className="text-sm font-semibold text-white"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        {current.title}
      </span>
      <span
        className="ml-1 text-xs transition-transform duration-200 group-hover:translate-x-1"
        style={{ color: style.color }}
      >
        →
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  WebGL Canvas — lazy loaded so Three.js (~580KB) doesn't block      */
/*  the initial page render.                                           */
/* ------------------------------------------------------------------ */
function HeroCanvasFallback() {
  // Simple animated gradient shown while Three.js loads
  return (
    <div
      className="absolute inset-0"
      style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(229,25,42,0.12), transparent 70%)",
      }}
      aria-hidden
    />
  );
}

function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const scrollY = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // FIX #22: Three.js is now dynamically imported so the ~580KB bundle
    // is only fetched after the component mounts, not on initial page load.
    let cancelled = false;

    import("three").then((THREE) => {
      if (cancelled) return;

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const w = () => mount.clientWidth;
      const h = () => mount.clientHeight;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x080808, 0.045);

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

      /* ---- Layer 1: Main particle field ---- */
      const PCOUNT = prefersReduced ? 600 : 2000;
      const positions = new Float32Array(PCOUNT * 3);
      const colors = new Float32Array(PCOUNT * 3);
      const sizes = new Float32Array(PCOUNT);

      const cRed = new THREE.Color(0xe5192a);
      const cGold = new THREE.Color(0xc9a84c);
      const cWhite = new THREE.Color(0xffffff);
      const cDeepRed = new THREE.Color(0x8b0000);

      for (let i = 0; i < PCOUNT; i++) {
        const layer = Math.random();
        const radius = 1.5 + layer * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5;
        positions[i * 3 + 2] = radius * Math.cos(phi) - 1;

        const r = Math.random();
        const col = r < 0.5 ? cRed : r < 0.72 ? cGold : r < 0.88 ? cWhite : cDeepRed;
        colors[i * 3]     = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        sizes[i] = 0.5 + Math.random() * 2.8;
      }

      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pGeom.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
      pGeom.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));

      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = spriteCanvas.height = 64;
      const sctx = spriteCanvas.getContext("2d")!;
      const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 64, 64);
      const sprite = new THREE.CanvasTexture(spriteCanvas);
      sprite.colorSpace = THREE.SRGBColorSpace;

      const pMat = new THREE.PointsMaterial({
        size: 0.07,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      /* ---- Layer 2: Inner dense core cluster ---- */
      const CORE = prefersReduced ? 80 : 300;
      const cPos = new Float32Array(CORE * 3);
      const cCol = new Float32Array(CORE * 3);
      for (let i = 0; i < CORE; i++) {
        const r2 = 0.3 + Math.random() * 1.8;
        const t2 = Math.random() * Math.PI * 2;
        const p2 = Math.acos(2 * Math.random() - 1);
        cPos[i * 3]     = r2 * Math.sin(p2) * Math.cos(t2);
        cPos[i * 3 + 1] = r2 * Math.sin(p2) * Math.sin(t2) * 0.4;
        cPos[i * 3 + 2] = r2 * Math.cos(p2);
        const mix = Math.random();
        cCol[i * 3]     = mix < 0.6 ? cRed.r : cGold.r;
        cCol[i * 3 + 1] = mix < 0.6 ? cRed.g : cGold.g;
        cCol[i * 3 + 2] = mix < 0.6 ? cRed.b : cGold.b;
      }
      const coreGeom = new THREE.BufferGeometry();
      coreGeom.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
      coreGeom.setAttribute("color",    new THREE.BufferAttribute(cCol, 3));
      const coreMat = new THREE.PointsMaterial({
        size: 0.12,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const core = new THREE.Points(coreGeom, coreMat);
      scene.add(core);

      /* ---- Layer 3: Nebula rings ---- */
      const RING_COUNT = 2;
      const rings: InstanceType<typeof THREE.Line>[] = [];
      for (let r = 0; r < RING_COUNT; r++) {
        const ringGeom = new THREE.BufferGeometry();
        const ringPts = 180;
        const rPos = new Float32Array(ringPts * 3);
        const radius2 = 2.5 + r * 1.8;
        for (let i = 0; i < ringPts; i++) {
          const angle = (i / ringPts) * Math.PI * 2;
          rPos[i * 3]     = radius2 * Math.cos(angle);
          rPos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
          rPos[i * 3 + 2] = radius2 * Math.sin(angle) * 0.35;
        }
        ringGeom.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
        const ringMat = new THREE.LineBasicMaterial({
          color: r === 0 ? 0xe5192a : 0xc9a84c,
          transparent: true,
          opacity: r === 0 ? 0.18 : 0.1,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Line(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2 + r * 0.3;
        scene.add(ring);
        rings.push(ring);
      }

      /* ---- Listeners ---- */
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

      /* ---- Animate ---- */
      const clock = new THREE.Clock();
      let raf = 0;
      let vis = true;
      const onVis = () => (vis = document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onVis);

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!vis) return;

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.035;
        mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.035;

        camera.position.x += (mouse.current.x * 0.7 - camera.position.x) * 0.04;
        camera.position.y += (mouse.current.y * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        points.rotation.y += dt * 0.035;
        points.rotation.x = Math.sin(t * 0.1) * 0.06;

        core.rotation.y -= dt * 0.07;
        core.rotation.z = Math.sin(t * 0.15) * 0.05;

        rings.forEach((ring, i) => {
          ring.rotation.z += dt * (i === 0 ? 0.025 : -0.018);
          (ring.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity =
            (i === 0 ? 0.18 : 0.1) + Math.sin(t * 0.5 + i) * 0.05;
        });

        pMat.opacity    = 0.7  + Math.sin(t * 0.6) * 0.15;
        coreMat.opacity = 0.85 + Math.sin(t * 0.9 + 1) * 0.12;

        const scrolled = Math.min(scrollY.current / (window.innerHeight * 0.9), 1);
        renderer.domElement.style.opacity = String(1 - scrolled * 0.95);
        camera.position.z = 7 + scrolled * 5;

        renderer.render(scene, camera);
      };
      tick();

      // Cleanup
      const cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("touchmove", onTouch);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        pGeom.dispose();
        pMat.dispose();
        coreGeom.dispose();
        coreMat.dispose();
        sprite.dispose();
        rings.forEach((r) => {
          r.geometry.dispose();
          (r.material as InstanceType<typeof THREE.Material>).dispose();
        });
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };

      // Store cleanup on the ref so the outer effect can call it
      (mount as any).__threeCleanup = cleanup;
    });

    return () => {
      cancelled = true;
      const cleanup = (mountRef.current as any)?.__threeCleanup;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/*  Cursor spotlight                                                    */
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
    const move = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", move);
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.background = `radial-gradient(700px circle at ${x}px ${y}px, rgba(229,25,42,0.09), transparent 55%)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
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

/* ------------------------------------------------------------------ */
/*  Main Hero3D component                                               */
/* ------------------------------------------------------------------ */
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
  // FIX #22: track whether canvas has mounted so we swap fallback → canvas
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ count: o }, { count: s }] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gt("expires_at", new Date().toISOString()),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gt("end_date", new Date().toISOString()),
      ]);
      setActiveCount(Math.max(o ?? 0, s ?? 0));
    };
    load();
    const i = setInterval(load, 30000);
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });

    // FIX #22: delay canvas mount by one frame so text/CTA renders first,
    // then Three.js loads in the background without blocking paint.
    const t = setTimeout(() => setCanvasReady(true), 0);

    return () => { clearInterval(i); window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as any },
    },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 640, background: "#080808" }}
    >
      {/* FIX #22: Canvas only mounts after first paint. Fallback gradient
          shows instantly while Three.js downloads and initialises. */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {canvasReady ? <HeroCanvas /> : <HeroCanvasFallback />}
      </div>

      {/* Cursor spotlight */}
      <CursorSpotlight />

      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 hero-grain"
        style={{ zIndex: 3, opacity: 0.04 }}
        aria-hidden
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 5,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,8,8,0.75) 100%)",
        }}
      />

      {/* Top fade */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-full"
        style={{ zIndex: 6, height: 140, background: "linear-gradient(#080808, transparent)" }}
      />

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{ zIndex: 6, height: 320, background: "linear-gradient(transparent, #080808)" }}
      />

      {/* Content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ zIndex: 10 }}
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
        }}
      >
        <div className="mx-auto w-full max-w-[920px]">

          {/* Location pill */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#E5192A",
                  animation: "hero-dot-pulse 2s ease infinite",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.4px" }}>
                🇿🇲 Zambia's streaming platform
              </span>
              <span
                style={{
                  background: "rgba(229,25,42,0.10)",
                  border: "1px solid rgba(229,25,42,0.22)",
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

          {/* AI Title Scroller */}
          <motion.div variants={fadeUp} className="mt-5 flex justify-center">
            <AITitleScroller />
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mt-8 font-display"
            style={{
              fontSize: "clamp(48px, 8.5vw, 100px)",
              fontWeight: 900,
              letterSpacing: "-3px",
              lineHeight: 0.93,
              color: "#FFFFFF",
            }}
          >
            <span className="block">Entertainment</span>
            <span className="block mt-1">
              <span
                style={{
                  background: "linear-gradient(135deg, #E5192A 0%, #FF4D5E 40%, #C9A84C 100%)",
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
            className="mx-auto mt-7"
            style={{
              fontSize: "clamp(15px, 1.4vw, 19px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.42)",
              maxWidth: 460,
              lineHeight: 1.75,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Netflix</span>.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>Prime Video</span>. Both.{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>No card</span>. Via{" "}
            <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>WhatsApp</span>. In 15 minutes.
          </motion.p>

          {/* Trust pills */}
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-2">
            {["⚡ 15-min activation", "🔒 No card required", "✓ 2-day free trial"].map((t) => (
              <span
                key={t}
                className="hero-trust-pill"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 999,
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          {/* CTAs */}
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

          {/* Social proof avatars */}
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

      {/* Scroll indicator */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ bottom: 40, zIndex: 10, opacity: scrolled ? 0 : 1, transition: "opacity 500ms" }}
      >
        <span
          style={{
            display: "block",
            width: 1,
            height: 52,
            background: "rgba(255,255,255,0.18)",
            transformOrigin: "top",
            animation: "hero-scroll-line 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.18)",
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
          0% { transform: scaleY(0); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
        }
        .hero-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: overlay;
        }
        .hero-trust-pill { transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94); }
        .hero-trust-pill:hover {
          border-color: rgba(255,255,255,0.14) !important;
          background: rgba(255,255,255,0.09) !important;
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
          padding: 17px 38px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
          text-decoration: none;
          letter-spacing: 0.2px;
        }
        .hero-btn-primary::before {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 550ms ease;
        }
        .hero-btn-primary:hover {
          background: #FF1F33;
          transform: scale(1.04) translateY(-1px);
          box-shadow: 0 0 0 1px rgba(229,25,42,0.3), 0 10px 30px rgba(229,25,42,0.45), 0 28px 56px rgba(229,25,42,0.22);
        }
        .hero-btn-primary:hover::before { left: 150%; }
        .hero-btn-primary:hover .hero-btn-arrow { transform: translateX(5px); }
        .hero-btn-arrow { transition: transform 220ms ease; }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 999px;
          padding: 16px 28px;
          font-size: 15px;
          font-weight: 500;
          color: rgba(255,255,255,0.65);
          transition: all 220ms cubic-bezier(0.25,0.46,0.45,0.94);
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.07);
          color: #fff;
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  );
  }
