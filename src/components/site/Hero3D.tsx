import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";

function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = () => mount.clientWidth;
    const height = () => mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width() / height(), 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ---------- Particles ----------
    const PCOUNT = 800;
    const particles: {
      mesh: THREE.Mesh;
      radius: number;
      speed: number;
      phase: number;
      incY: number;
      incZ: number;
      floatAmp: number;
      floatFreq: number;
      baseY: number;
    }[] = [];

    const colorChoices = [
      { hex: 0xe5192a, alpha: 0.6, weight: 0.6 },
      { hex: 0xffffff, alpha: 0.3, weight: 0.25 },
      { hex: 0xc9a84c, alpha: 0.5, weight: 0.15 },
    ];

    const sphereGeom = new THREE.SphereGeometry(0.015, 6, 6);

    for (let i = 0; i < PCOUNT; i++) {
      const r = Math.random();
      let c = colorChoices[0];
      let acc = 0;
      for (const ch of colorChoices) {
        acc += ch.weight;
        if (r <= acc) { c = ch; break; }
      }
      const mat = new THREE.MeshBasicMaterial({
        color: c.hex,
        transparent: true,
        opacity: c.alpha,
      });
      const mesh = new THREE.Mesh(sphereGeom, mat);
      const radius = 1.5 + Math.random() * 5.5;
      const phase = Math.random() * Math.PI * 2;
      const incY = (Math.random() - 0.5) * 1.2;
      const incZ = (Math.random() - 0.5) * 0.6;
      const baseY = (Math.random() - 0.5) * 4;
      mesh.position.set(
        Math.cos(phase) * radius,
        baseY,
        Math.sin(phase) * radius - 1,
      );
      scene.add(mesh);
      particles.push({
        mesh,
        radius,
        speed: 0.0002 + Math.random() * 0.0006,
        phase,
        incY,
        incZ,
        floatAmp: 0.02 + Math.random() * 0.06,
        floatFreq: 0.4 + Math.random() * 1.2,
        baseY,
      });
    }

    // ---------- Icosahedron with EdgesGeometry ----------
    const icoGeom = new THREE.IcosahedronGeometry(2, 1);
    const basePositions = icoGeom.attributes.position.array.slice() as Float32Array;
    const edgesGeom = new THREE.EdgesGeometry(icoGeom);
    const edgeMatA = new THREE.LineBasicMaterial({
      color: 0xe5192a,
      transparent: true,
      opacity: 0.9,
    });
    const edges = new THREE.LineSegments(edgesGeom, edgeMatA);
    edges.position.set(1.5, 0, 0);
    scene.add(edges);

    // soft inner translucent fill
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xe5192a,
      transparent: true,
      opacity: 0.04,
    });
    const fillMesh = new THREE.Mesh(icoGeom, fillMat);
    fillMesh.position.copy(edges.position);
    scene.add(fillMesh);

    // halo sprite-like glow using a large transparent sphere
    const haloGeom = new THREE.SphereGeometry(2.4, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xe5192a,
      transparent: true,
      opacity: 0.05,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.copy(edges.position);
    scene.add(halo);

    // ---------- Listeners ----------
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // ---------- Animate ----------
    let raf = 0;
    const start = performance.now();
    const posAttr = icoGeom.attributes.position as THREE.BufferAttribute;

    const tick = () => {
      const t = (performance.now() - start) / 1000;

      // mouse easing
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.05;

      // camera follows mouse
      camera.position.x = mouseRef.current.x * 0.5;
      camera.position.y = mouseRef.current.y * 0.3;
      camera.lookAt(0, 0, 0);

      // particles
      for (const p of particles) {
        const ang = p.phase + t * p.speed * 600;
        p.mesh.position.x =
          Math.cos(ang) * p.radius + mouseRef.current.x * 0.15;
        p.mesh.position.z = Math.sin(ang) * p.radius - 1 + p.incZ;
        p.mesh.position.y =
          p.baseY + Math.sin(t * p.floatFreq + p.phase) * p.floatAmp + p.incY * 0.2;
      }

      // ico vertex displacement (breathing)
      for (let i = 0; i < basePositions.length; i += 3) {
        const bx = basePositions[i];
        const by = basePositions[i + 1];
        const bz = basePositions[i + 2];
        const disp = Math.sin(t * 0.3 + bx * 2) * 0.15;
        const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        posAttr.setXYZ(i / 3, bx + (bx / len) * disp, by + (by / len) * disp, bz + (bz / len) * disp);
      }
      posAttr.needsUpdate = true;
      edgesGeom.dispose();
      const newEdges = new THREE.EdgesGeometry(icoGeom);
      edges.geometry.dispose?.();
      (edges as any).geometry = newEdges;

      // ico transforms
      edges.rotation.y += 0.001;
      edges.rotation.x += 0.0005;
      fillMesh.rotation.copy(edges.rotation);
      const float = Math.sin(t * 0.4) * 0.15;
      const scl = 1 + Math.sin(t * 0.6) * 0.015;
      edges.position.set(1.5, float, 0);
      fillMesh.position.copy(edges.position);
      halo.position.copy(edges.position);
      edges.scale.setScalar(scl);
      fillMesh.scale.setScalar(scl);

      // edge color shimmer red <-> gold
      const mix = 0.5 + 0.5 * Math.sin(t * 0.5);
      const r = 0xe5 / 255;
      const g = (0x19 + (0xa8 - 0x19) * mix * 0.5) / 255;
      const b = (0x2a + (0x4c - 0x2a) * mix * 0.4) / 255;
      edgeMatA.color.setRGB(r, g, b);

      // scroll fade
      const scrolled = Math.min(scrollRef.current / (window.innerHeight * 0.8), 1);
      renderer.domElement.style.opacity = String(1 - scrolled);
      camera.position.z = 6 + scrolled * 4;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      sphereGeom.dispose();
      icoGeom.dispose();
      haloGeom.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
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

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
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

      {/* Layer 3 overlays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 5,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(8,8,8,0.6) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute top-0 left-0 w-full"
        style={{
          zIndex: 6,
          height: 120,
          background: "linear-gradient(#080808, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{
          zIndex: 6,
          height: 280,
          background: "linear-gradient(transparent, #080808)",
        }}
      />

      {/* Layer 2: content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ zIndex: 10 }}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
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
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
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
          <motion.div
            variants={fadeUp}
            className="mt-10 flex items-center justify-center gap-4"
          >
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
        style={{
          bottom: 40,
          zIndex: 10,
          opacity: scrolled ? 0 : 1,
          transition: "opacity 400ms",
        }}
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
