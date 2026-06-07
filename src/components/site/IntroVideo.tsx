import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export function IntroVideo() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "intro_video_url")
      .maybeSingle()
      .then(({ data }) => setVideoUrl(data?.value ?? ""));
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32"
      style={{ background: "#080808" }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(229,25,42,0.10), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              color: "#E5192A",
              background: "rgba(229,25,42,0.08)",
              border: "1px solid rgba(229,25,42,0.2)",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#E5192A",
                animation: "intro-dot 2s ease infinite",
              }}
            />
            Watch in 60 seconds
          </span>
          <h2
            className="mt-5 font-display"
            style={{
              fontSize: "clamp(34px, 5vw, 56px)",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.05,
              color: "#fff",
            }}
          >
            How Axxess{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #E5192A 0%, #FF4D5E 50%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              actually works
            </span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl"
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
            }}
          >
            No card. No contracts. No catch. See exactly how you go from WhatsApp
            message to streaming Netflix in under 15 minutes.
          </p>
        </motion.div>

        {/* Video frame */}
        <motion.div
          style={{ y, scale }}
          className="relative mx-auto mt-14"
        >
          {/* Outer gradient border */}
          <div
            className="intro-video-shell relative rounded-[28px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(229,25,42,0.6) 0%, rgba(201,168,76,0.35) 50%, rgba(255,255,255,0.08) 100%)",
            }}
          >
            <div
              className="relative overflow-hidden rounded-[26px]"
              style={{
                background: "#0a0a0a",
                boxShadow:
                  "0 30px 80px -20px rgba(229,25,42,0.35), 0 50px 100px -40px rgba(0,0,0,0.8)",
              }}
            >
              {/* Browser-like chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 5, background: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: 5, background: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: 5, background: "#28c840" }} />
                <span
                  className="ml-3 truncate text-[11px]"
                  style={{ color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 }}
                >
                  axxess.zm / how-it-works
                </span>
              </div>

              {/* Video area */}
              <div className="relative aspect-video w-full bg-black">
                {videoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      playsInline
                      muted={muted}
                      loop
                      onClick={toggle}
                      className="h-full w-full cursor-pointer object-cover"
                    />
                    {/* Play overlay */}
                    <button
                      type="button"
                      onClick={toggle}
                      aria-label={playing ? "Pause video" : "Play video"}
                      className="group absolute inset-0 flex items-center justify-center"
                      style={{
                        background: playing
                          ? "transparent"
                          : "linear-gradient(180deg, rgba(8,8,8,0.2), rgba(8,8,8,0.6))",
                        transition: "background 300ms ease",
                      }}
                    >
                      <span
                        className="intro-play-btn"
                        style={{
                          opacity: playing ? 0 : 1,
                          transform: playing ? "scale(0.85)" : "scale(1)",
                          transition: "all 250ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                      >
                        <span className="intro-play-ripple" />
                        <span className="intro-play-ripple intro-play-ripple-2" />
                        <Play className="relative h-7 w-7" fill="currentColor" />
                      </span>
                    </button>
                    {/* Mute control */}
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={muted ? "Unmute" : "Mute"}
                      className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition hover:scale-105"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                      }}
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </>
                ) : (
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 50%, rgba(229,25,42,0.18), transparent 60%)",
                      }}
                    />
                    <div className="intro-play-btn relative">
                      <span className="intro-play-ripple" />
                      <span className="intro-play-ripple intro-play-ripple-2" />
                      <Play className="relative h-7 w-7" fill="currentColor" />
                    </div>
                    <p
                      className="absolute bottom-6 text-xs"
                      style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}
                    >
                      Intro video coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reflection */}
          <div
            aria-hidden
            className="pointer-events-none mx-auto mt-1 h-24 w-[92%] opacity-40 blur-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(229,25,42,0.35), transparent 80%)",
              borderRadius: "50%",
            }}
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes intro-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(229,25,42,0); }
        }
        @keyframes intro-ripple {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .intro-video-shell {
          transition: transform 400ms cubic-bezier(0.16,1,0.3,1);
        }
        .intro-video-shell:hover { transform: translateY(-4px); }
        .intro-play-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E5192A, #FF4D5E);
          color: #fff;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 18px 40px rgba(229,25,42,0.45),
            0 30px 80px rgba(229,25,42,0.25);
        }
        .intro-play-ripple {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(229,25,42,0.55);
          animation: intro-ripple 2.4s cubic-bezier(0.16,1,0.3,1) infinite;
        }
        .intro-play-ripple-2 { animation-delay: 1.2s; }
      `}</style>
    </section>
  );
}
