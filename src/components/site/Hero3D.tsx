import { useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import * as THREE from "three";

// ─── Constants ────────────────────────────────────────────────────────────────
const RED    = new THREE.Color("#E5192A");
const GOLD   = new THREE.Color("#C9A84C");
const WHITE  = new THREE.Color("#ffffff");

const LAYER_CONFIGS = [
  // [count, size, speed, opacity, depth]
  { count: 2800, size: 0.28, speed: 0.012, opacity: 0.18, spread: 28, depth: -18 }, // deep stars
  { count: 900,  size: 0.55, speed: 0.026, opacity: 0.42, spread: 18, depth: -8  }, // mid dust
  { count: 120,  size: 1.40, speed: 0.008, opacity: 0.22, spread: 10, depth: -2  }, // foreground bokeh
] as const;

// ─── Vertex shader ─────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  attribute float aOpacity;
  attribute float aSize;
  attribute float aColorMix;   // 0 = white, 1 = red, 2 = gold
  attribute float aPhase;
  attribute float aDrift;

  uniform float uTime;
  uniform vec2  uMouse;        // normalised -1..1
  uniform float uDepthFactor;  // parallax strength for this layer
  uniform float uDPR;

  varying float vOpacity;
  varying float vColorMix;

  void main() {
    vOpacity  = aOpacity;
    vColorMix = aColorMix;

    vec3 pos = position;

    // Organic drift — each particle on its own sine path
    pos.x += sin(uTime * aDrift + aPhase)           * 0.18;
    pos.y += cos(uTime * aDrift * 0.7 + aPhase * 2.0) * 0.14;
    pos.z += sin(uTime * aDrift * 0.4 + aPhase * 0.5) * 0.08;

    // Mouse parallax — deeper layers move less
    pos.x += uMouse.x * uDepthFactor;
    pos.y += uMouse.y * uDepthFactor * 0.6;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Size attenuation — particles fade with depth
    gl_PointSize = aSize * uDPR * (280.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 0.4, 12.0);
  }
`;

// ─── Fragment shader ───────────────────────────────────────────────────────────
const FRAG = /* glsl */ `
  uniform vec3 uColorWhite;
  uniform vec3 uColorRed;
  uniform vec3 uColorGold;
  uniform float uTime;

  varying float vOpacity;
  varying float vColorMix;

  void main() {
    // Soft circular particle
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Feathered edge — bright core, soft corona
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.6);

    // Color resolve
    vec3 col;
    if (vColorMix < 1.0) {
      col = mix(uColorWhite, uColorRed, vColorMix);
    } else {
      col = mix(uColorRed, uColorGold, vColorMix - 1.0);
    }

    // Subtle twinkle — cheap flicker via time + gl_FragCoord
    float twinkle = 0.88 + 0.12 * sin(uTime * 2.8 + gl_FragCoord.x * 0.07 + gl_FragCoord.y * 0.05);

    gl_FragColor = vec4(col, alpha * vOpacity * twinkle);
  }
`;

// ─── Build one particle layer ──────────────────────────────────────────────────
function buildLayer(cfg: typeof LAYER_CONFIGS[number]) {
  const { count, size, opacity, spread, depth } = cfg;

  const positions  = new Float32Array(count * 3);
  const opacities  = new Float32Array(count);
  const sizes      = new Float32Array(count);
  const colorMixes = new Float32Array(count);
  const phases     = new Float32Array(count);
  const drifts     = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Distribute in a wide, relatively thin slab
    positions[i3]     = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = (Math.random() - 0.5) * spread * 0.7;
    positions[i3 + 2] = depth + (Math.random() - 0.5) * 6;

    // Slight size variation
    sizes[i]      = size * (0.5 + Math.random() * 1.1);
    opacities[i]  = opacity * (0.3 + Math.random() * 0.7);
    phases[i]     = Math.random() * Math.PI * 2;
    drifts[i]     = 0.3 + Math.random() * 0.7;

    // Color distribution — mostly white, rare red/gold
    const r = Math.random();
    if (r < 0.04)       colorMixes[i] = 1.0 + Math.random() * 0.6; // red–gold
    else if (r < 0.10)  colorMixes[i] = Math.random() * 0.6;        // white–red
    else                colorMixes[i] = 0.0;                          // pure white
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position",  new THREE.BufferAttribute(positions,  3));
  geo.setAttribute("aOpacity",  new THREE.BufferAttribute(opacities,  1));
  geo.setAttribute("aSize",     new THREE.BufferAttribute(sizes,      1));
  geo.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));
  geo.setAttribute("aPhase",    new THREE.BufferAttribute(phases,     1));
  geo.setAttribute("aDrift",    new THREE.BufferAttribute(drifts,     1));

  return geo;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function Hero3D() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const mouseRef    = useRef({ x: 0, y: 0, tx: 0, ty: 0 }); // current / target
  const rafRef      = useRef<number>(0);
  const scrollRef   = useRef(0);

  // ── Cinematic text timing state (CSS-driven, no JS re-renders) ──────────────
  const heroRef     = useRef<HTMLDivElement>(null);

  // ── Three.js bootstrap ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Scene + Camera
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;

    // Resize helper
    function setSize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    const dpr = Math.min(window.devicePixelRatio, 2);

    // ── Uniforms shared across layers ─────────────────────────────────────────
    const sharedUniforms = {
      uTime:        { value: 0 },
      uMouse:       { value: new THREE.Vector2(0, 0) },
      uColorWhite:  { value: WHITE },
      uColorRed:    { value: RED },
      uColorGold:   { value: GOLD },
      uDPR:         { value: dpr },
    };

    // ── Build particle systems ─────────────────────────────────────────────────
    const parallaxFactors = [0.06, 0.20, 0.55]; // deep → foreground

    const systems = LAYER_CONFIGS.map((cfg, i) => {
      const geo = buildLayer(cfg);
      const mat = new THREE.ShaderMaterial({
        vertexShader:   VERT,
        fragmentShader: FRAG,
        uniforms: {
          ...sharedUniforms,
          uDepthFactor: { value: parallaxFactors[i] },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return { points, mat, speed: cfg.speed };
    });

    // ── Projector beam — volumetric cone (screen-space radial gradient mesh) ──
    // We fake volumetric by placing a cone-shaped plane mesh in world space.
    {
      const beamGeo = new THREE.PlaneGeometry(6, 14, 1, 1);
      const beamMat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            // Vertical cone: bright top-centre, fades out at bottom & edges
            float edgeFade  = 1.0 - abs(vUv.x - 0.5) * 2.0;
            edgeFade        = pow(edgeFade, 2.0);
            float depthFade = 1.0 - vUv.y;
            depthFade       = pow(depthFade, 1.4);
            float alpha = edgeFade * depthFade * 0.055;
            // Mix projector-warm colour: red at top, bleeding to gold at bottom
            vec3 col = mix(vec3(0.898, 0.098, 0.165), vec3(0.788, 0.659, 0.298), vUv.y);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 1.5, -10);
      scene.add(beam);
    }

    // ── Mouse tracking ─────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      mouseRef.current.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseRef.current.ty = (e.clientY / window.innerHeight - 0.5) * -2;
    }

    // Gyroscope for mobile
    function onDeviceOrientation(e: DeviceOrientationEvent) {
      if (e.gamma == null || e.beta == null) return;
      mouseRef.current.tx = (e.gamma / 30) * 0.8;
      mouseRef.current.ty = ((e.beta  - 30) / 30) * 0.5;
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });

    // ── Scroll parallax on camera ──────────────────────────────────────────────
    function onScroll() {
      scrollRef.current = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── Render loop ────────────────────────────────────────────────────────────
    let startTime = performance.now();

    function tick() {
      rafRef.current = requestAnimationFrame(tick);

      const elapsed = (performance.now() - startTime) * 0.001;

      // Smooth mouse lerp — creates inertia feel
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.045;

      // Update uniforms
      const mu = new THREE.Vector2(mouseRef.current.x, mouseRef.current.y);
      systems.forEach(({ mat, speed }) => {
        mat.uniforms.uTime.value  = elapsed * speed * 60;
        mat.uniforms.uMouse.value = mu;
      });

      // Very slow auto-rotation adds life when mouse is still
      scene.rotation.y = Math.sin(elapsed * 0.04) * 0.06 + mouseRef.current.x * 0.015;
      scene.rotation.x = Math.sin(elapsed * 0.03) * 0.03 + mouseRef.current.y * 0.010;

      // Subtle camera drift with scroll
      camera.position.y = -scrollRef.current * 0.002;

      renderer.render(scene, camera);
    }
    tick();

    // ── Cleanup ────────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      window.removeEventListener("scroll", onScroll);
      systems.forEach(({ points }) => {
        points.geometry.dispose();
        (points.material as THREE.ShaderMaterial).dispose();
      });
      renderer.dispose();
    };
  }, []);

  // ── Scroll indicator fade ──────────────────────────────────────────────────
  const handleScrollClick = useCallback(() => {
    const target = document.getElementById("plans");
    target?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", minHeight: 600 }}
      aria-label="Hero — Axxess Entertainment"
    >
      {/* ── WebGL Canvas ──────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
        aria-hidden="true"
      />

      {/* ── Deep void gradient overlay — ensures text legibility ─────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, transparent 20%, rgba(8,8,8,0.55) 70%, rgba(8,8,8,0.92) 100%),
            linear-gradient(to bottom, rgba(8,8,8,0.30) 0%, rgba(8,8,8,0.10) 35%, rgba(8,8,8,0.10) 65%, rgba(8,8,8,0.85) 100%)
          `,
        }}
      />

      {/* ── Vignette ring ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 160px 40px rgba(8,8,8,0.75)",
        }}
      />

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-5 text-center">

        {/* ── Pre-title badge ───────────────────────────────────────────────────
             Appears first — sets the stage. Fades in at 0.4s              */}
        <div
          className="mb-6 sm:mb-8"
          style={{
            animation: "heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both",
          }}
        >
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
            style={{
              borderColor: "rgba(201,168,76,0.35)",
              background:  "rgba(201,168,76,0.07)",
              color:       "#C9A84C",
              letterSpacing: "0.18em",
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6, height: 6,
                background: "#C9A84C",
                boxShadow: "0 0 8px 2px rgba(201,168,76,0.7)",
                animation: "goldPulse 2s ease-in-out infinite",
              }}
            />
            Zambia's Premium Streaming
          </span>
        </div>

        {/* ── HEADLINE — Clip-reveal, line by line ──────────────────────────────
             Line 1 uncovers at 1.0s, line 2 at 1.25s                      */}
        <h1
          className="font-display font-black leading-none tracking-tight select-none"
          style={{
            fontSize: "clamp(3.2rem, 10vw + 1rem, 9.5rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.025em",
          }}
        >
          {/* Line 1 */}
          <span
            className="block overflow-hidden"
            style={{ paddingBottom: "0.08em" }}
          >
            <span
              className="block text-white"
              style={{
                animation: "lineReveal 0.9s cubic-bezier(0.22,1,0.36,1) 1.0s both",
              }}
            >
              ENTERTAINMENT
            </span>
          </span>

          {/* Line 2 — gold accent word */}
          <span
            className="block overflow-hidden"
            style={{ paddingBottom: "0.08em" }}
          >
            <span
              className="block"
              style={{
                animation: "lineReveal 0.9s cubic-bezier(0.22,1,0.36,1) 1.25s both",
              }}
            >
              <span className="text-white">YOU </span>
              <span
                style={{
                  WebkitTextFillColor: "transparent",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  backgroundImage: "linear-gradient(135deg, #C9A84C 0%, #f0d080 45%, #C9A84C 100%)",
                  display: "inline-block",
                }}
              >
                DESERVE.
              </span>
            </span>
          </span>
        </h1>

        {/* ── Subheadline ───────────────────────────────────────────────────────
             Fades in at 2.0s                                               */}
        <p
          className="mt-6 sm:mt-8 font-sans"
          style={{
            fontSize: "clamp(0.85rem, 1.6vw + 0.3rem, 1.05rem)",
            color: "rgba(255,255,255,0.62)",
            letterSpacing: "0.02em",
            maxWidth: 520,
            animation: "heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 2.0s both",
          }}
        >
          Netflix. Prime Video.{" "}
          <span style={{ color: "#C9A84C", fontWeight: 500 }}>From K60/month.</span>
          {" "}No card needed. Activated via WhatsApp.
        </p>

        {/* ── CTA ───────────────────────────────────────────────────────────────
             Single button. Appears at 2.65s                                */}
        <div
          className="mt-8 sm:mt-10"
          style={{
            animation: "heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 2.65s both",
          }}
        >
          <Link
            to="/trial"
            className="group relative inline-flex items-center gap-3 rounded-full font-semibold text-white overflow-hidden"
            style={{
              background:   "#E5192A",
              padding:      "clamp(14px, 2vw, 18px) clamp(32px, 5vw, 52px)",
              fontSize:     "clamp(0.85rem, 1.2vw + 0.2rem, 1rem)",
              letterSpacing:"0.01em",
              boxShadow:    "0 0 0 1px rgba(229,25,42,0.5), 0 8px 40px -8px rgba(229,25,42,0.65)",
              transition:   "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform  = "scale(1.04)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(229,25,42,0.6), 0 12px 52px -6px rgba(229,25,42,0.80)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform  = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(229,25,42,0.5), 0 8px 40px -8px rgba(229,25,42,0.65)";
            }}
          >
            {/* Shimmer sweep on hover */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "btnShimmer 1.8s linear infinite",
                transition: "opacity 0.3s",
              }}
            />
            <span className="relative">Start Free Trial</span>
            <span
              className="relative inline-block"
              style={{
                transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
              }}
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>

        {/* ── Trust micro-line ──────────────────────────────────────────────────
             Whisper-level. Appears at 3.2s                                 */}
        <div
          className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5"
          style={{
            animation: "heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 3.2s both",
          }}
        >
          {[
            { icon: "⚡", label: "15-min activation" },
            { icon: "🔒", label: "No card required" },
            { icon: "✓",  label: "2-day free trial"  },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 font-sans"
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "0.03em",
              }}
            >
              <span style={{ opacity: 0.7 }}>{icon}</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Scroll indicator ──────────────────────────────────────────────────── */}
      <button
        onClick={handleScrollClick}
        aria-label="Scroll to plans"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0"
        style={{
          animation: "scrollIndicatorIn 1s ease 3.8s both",
        }}
      >
        <span
          className="block rounded-full"
          style={{
            width: 1,
            height: 38,
            background: "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.35))",
            animation: "scrollLinePulse 2.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.28)",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
          }}
        >
          scroll
        </span>
      </button>

      {/* ── Keyframes injected once via style tag ─────────────────────────────── */}
      <style>{`
        @keyframes lineReveal {
          from { transform: translateY(105%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes heroFadeUp {
          from { transform: translateY(22px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes goldPulse {
          0%,100% { box-shadow: 0 0 8px 2px rgba(201,168,76,0.7); }
          50%     { box-shadow: 0 0 14px 4px rgba(201,168,76,0.3); }
        }
        @keyframes scrollLinePulse {
          0%,100% { opacity: 0.4; transform: scaleY(1);    }
          50%     { opacity: 0.9; transform: scaleY(1.08); }
        }
        @keyframes scrollIndicatorIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes btnShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
   }
