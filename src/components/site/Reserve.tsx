import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Crown, Loader2, ShieldCheck, Star,
  CheckCircle2, Lock, Users, Clock, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { rememberCustomer, getRememberedName, getRememberedPhone, firstName } from "@/lib/customer";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Svc = { id: string; name: string; slug: string; is_full: boolean; price_kwacha: number };

const PACKAGE_META: Record<string, { color: string; glow: string; label: string }> = {
  netflix:    { color: "#E5192A", glow: "rgba(229,25,42,0.45)",   label: "Netflix"     },
  prime:      { color: "#00A8E1", glow: "rgba(0,168,225,0.45)",   label: "Prime Video" },
  "all-access":{ color: "#C9A84C", glow: "rgba(201,168,76,0.45)", label: "All Access"  },
};

function pkgMeta(slug: string, name: string) {
  const s = slug + " " + name.toLowerCase();
  if (s.includes("netflix"))            return PACKAGE_META["netflix"];
  if (s.includes("prime"))              return PACKAGE_META["prime"];
  if (s.includes("all") || s.includes("bundle")) return PACKAGE_META["all-access"];
  return { color: "#E5192A", glow: "rgba(229,25,42,0.45)", label: name };
}

/* ─── Validation ─────────────────────────────────────────────────────────── */
const schema = z.object({
  customer_name:  z.string().trim().min(2,  "Name must be at least 2 characters").max(80),
  customer_phone: z.string().trim().min(9,  "Enter a valid WhatsApp number").max(20),
  service_id:     z.string().min(1,         "Please select a package"),
});

/* ─── Reserve component ──────────────────────────────────────────────────── */
export function Reserve() {
  const formRef    = useRef<HTMLFormElement>(null);
  const nameRef    = useRef<HTMLInputElement>(null);

  const [services,      setServices]      = useState<Svc[]>([]);
  const [serviceId,     setServiceId]     = useState("");
  const [name,          setName]          = useState(getRememberedName());
  const [phone,         setPhone]         = useState(getRememberedPhone());
  const [submitting,    setSubmitting]    = useState(false);
  const [reserveCount,  setReserveCount]  = useState<number | null>(null);
  const [confirmed,     setConfirmed]     = useState<{
    name: string; phone: string; serviceName: string; position: number;
  } | null>(null);

  /* ── Load services + real reservation count ── */
  useEffect(() => {
    supabase
      .from("services")
      .select("id,name,slug,is_full,price_kwacha")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data ?? []) as Svc[]));

    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setReserveCount(count ?? 0));
  }, []);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = schema.safeParse({ customer_name: name, customer_phone: phone, service_id: serviceId });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    const svc = services.find((s) => s.id === serviceId);
    setSubmitting(true);

    const { error, data } = await supabase
      .from("reservations")
      .insert({
        customer_name:  parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        service_id:     parsed.data.service_id,
        service_name:   svc?.name ?? "Unknown",
        note:           null,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error) { toast.error("Could not reserve your slot: " + error.message); return; }

    rememberCustomer(parsed.data.customer_name, parsed.data.customer_phone);

    // Real position = current count + 1
    const position = (reserveCount ?? 0) + 1;
    setReserveCount((c) => (c ?? 0) + 1);

    setConfirmed({
      name:        parsed.data.customer_name,
      phone:       parsed.data.customer_phone,
      serviceName: svc?.name ?? "your package",
      position,
    });
  };

  /* ── Selected service meta ── */
  const selectedSvc = services.find((s) => s.id === serviceId);
  const selectedMeta = selectedSvc
    ? pkgMeta(selectedSvc.slug, selectedSvc.name)
    : null;

  /* ════════════════════════════════════════════════════════════════════════ */
  /*  CONFIRMED STATE                                                         */
  /* ════════════════════════════════════════════════════════════════════════ */
  if (confirmed) {
    const fn        = firstName(confirmed.name);
    const waMessage = encodeURIComponent(
      `Hi Axxess! I just reserved my ${confirmed.serviceName} slot.\n\nName: ${confirmed.name}\nWhatsApp: ${confirmed.phone}\n\nPlease confirm my place on the list. 🙏`
    );
    const waLink = `https://wa.me/260770514809?text=${waMessage}`;

    return (
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-lg text-center">

          {/* Animated tick */}
          <div
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(229,25,42,0.18), transparent 70%)",
              border:     "1.5px solid rgba(229,25,42,0.35)",
              boxShadow:  "0 0 60px -12px rgba(229,25,42,0.6)",
              animation:  "reserve-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <CheckCircle2
              className="h-12 w-12"
              style={{ color: "#E5192A", filter: "drop-shadow(0 0 12px rgba(229,25,42,0.7))" }}
            />
          </div>

          {/* Heading */}
          <div style={{ animation: "reserve-fade-up 0.7s ease 0.2s both" }}>
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
              style={{
                background: "rgba(229,25,42,0.10)",
                border:     "1px solid rgba(229,25,42,0.25)",
                color:      "#E5192A",
              }}
            >
              <Crown className="h-3.5 w-3.5" /> Slot Reserved
            </span>
            <h1 className="font-display text-3xl font-black text-white sm:text-4xl">
              {fn ? `You're on the list, ${fn}.` : "You're on the list."}
            </h1>
            <p className="mt-3 text-base text-white/55 leading-relaxed max-w-sm mx-auto">
              You're{" "}
              <span className="text-white font-semibold">#{confirmed.position}</span>{" "}
              on the reserve list for{" "}
              <span className="text-white font-semibold">{confirmed.serviceName}</span>.
              We'll contact you on WhatsApp the moment a slot opens — before anyone else.
            </p>
          </div>

          {/* WhatsApp CTA */}
          <div
            className="mt-8 space-y-3"
            style={{ animation: "reserve-fade-up 0.7s ease 0.4s both" }}
          >
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-full py-4 font-bold text-white text-base transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                boxShadow:  "0 0 40px -8px rgba(37,211,102,0.55)",
              }}
            >
              {/* WhatsApp icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Confirm my slot on WhatsApp
            </a>

            <p className="text-xs text-white/30 text-center">
              Opens WhatsApp with your details pre-filled. Just tap send.
            </p>
          </div>

          {/* What happens next */}
          <div
            className="mt-8 rounded-2xl p-5 text-left"
            style={{
              background: "rgba(255,255,255,0.03)",
              border:     "1px solid rgba(255,255,255,0.07)",
              animation:  "reserve-fade-up 0.7s ease 0.55s both",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
              What happens next
            </p>
            {[
              { icon: "💬", text: "We save your spot and keep your number" },
              { icon: "🔔", text: "The moment a slot opens, you get a WhatsApp from us — before anyone else" },
              { icon: "⚡", text: "Confirm and you're live within 15 minutes" },
              { icon: "🔒", text: "Your price is locked at today's rate" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-base leading-none mt-0.5">{icon}</span>
                <span className="text-sm text-white/60 leading-snug">{text}</span>
              </div>
            ))}
          </div>

        </div>

        <style>{`
          @keyframes reserve-pop {
            from { transform: scale(0.5); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes reserve-fade-up {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </section>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════ */
  /*  MAIN PAGE                                                               */
  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <section id="reserve" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
            style={{
              background: "rgba(201,168,76,0.10)",
              border:     "1px solid rgba(201,168,76,0.25)",
              color:      "#C9A84C",
            }}
          >
            <Crown className="h-3.5 w-3.5" /> VIP Reserve List
          </span>
          <h1 className="font-display text-3xl font-black text-white sm:text-4xl leading-tight">
            Lock in your price.<br />
            <span style={{ color: "#E5192A" }}>Go live the moment</span> a slot opens.
          </h1>
          <p className="mt-4 text-base text-white/50 max-w-md mx-auto leading-relaxed">
            We contact our reserve list privately before any public announcement.
            No payment today — we only charge when your slot activates.
          </p>
        </div>

        {/* ── REAL-TIME COUNTER ────────────────────────────────────────── */}
        <div
          className="mb-8 flex flex-wrap items-center justify-center gap-4"
        >
          {/* People on list */}
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5"
            style={{
              background:    "rgba(255,255,255,0.04)",
              border:        "1px solid rgba(255,255,255,0.08)",
              backdropFilter:"blur(12px)",
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#E5192A",
                display: "inline-block",
                boxShadow: "0 0 8px 2px rgba(229,25,42,0.6)",
                animation: "reserve-dot-pulse 2s ease infinite",
              }}
            />
            <span className="text-sm font-semibold text-white/70">
              {reserveCount === null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading
                </span>
              ) : (
                <>
                  <span className="text-white font-bold">{reserveCount}</span>
                  {" "}{reserveCount === 1 ? "person" : "people"} on the reserve list
                </>
              )}
            </span>
          </div>

          {/* Hold period */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "rgba(201,168,76,0.07)",
              border:     "1px solid rgba(201,168,76,0.18)",
            }}
          >
            <Clock className="h-3.5 w-3.5 text-[#C9A84C]" />
            <span className="text-xs font-semibold text-[#C9A84C]">
              Slot held for 30 days
            </span>
          </div>
        </div>

        {/* ── MAIN CARD ────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(22,8,10,1) 0%, rgba(12,12,18,1) 100%)",
            border:     "1px solid rgba(255,255,255,0.07)",
            boxShadow:  "0 24px 80px -20px rgba(0,0,0,0.8)",
          }}
        >
          {/* Top red accent line */}
          <div
            style={{
              height:     2,
              background: "linear-gradient(90deg, transparent, #E5192A 30%, #C9A84C 70%, transparent)",
            }}
          />

          <div className="p-6 sm:p-8">

            {/* ── PACKAGE SELECTOR ─────────────────────────────────────── */}
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/35 mb-3">
                1 — Choose your package
              </p>

              {services.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {services.map((svc) => {
                    const meta    = pkgMeta(svc.slug, svc.name);
                    const active  = serviceId === svc.id;
                    const isFull  = !!svc.is_full;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setServiceId(svc.id);
                          // Smooth scroll to name field after pick
                          setTimeout(() => nameRef.current?.focus(), 80);
                        }}
                        className="relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all duration-200"
                        style={{
                          background:  active
                            ? `${meta.color}14`
                            : "rgba(255,255,255,0.03)",
                          border: active
                            ? `1.5px solid ${meta.color}70`
                            : "1.5px solid rgba(255,255,255,0.07)",
                          boxShadow: active
                            ? `0 0 28px -8px ${meta.glow}`
                            : "none",
                          opacity:   isFull ? 0.45 : 1,
                          cursor:    isFull ? "not-allowed" : "pointer",
                          transform: active ? "translateY(-2px)" : "none",
                        }}
                      >
                        {/* Active ring indicator */}
                        {active && (
                          <span
                            className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full"
                            style={{ background: meta.color }}
                          >
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </span>
                        )}

                        {isFull && (
                          <span className="absolute top-3 right-3">
                            <Lock className="h-3.5 w-3.5 text-white/30" />
                          </span>
                        )}

                        {/* Price */}
                        <div>
                          <span
                            className="font-display text-2xl font-black leading-none"
                            style={{ color: isFull ? "rgba(255,255,255,0.3)" : meta.color }}
                          >
                            K{svc.price_kwacha}
                          </span>
                          <span className="text-[10px] text-white/35">/mo</span>
                        </div>

                        {/* Name */}
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{ color: isFull ? "rgba(255,255,255,0.3)" : "#fff" }}
                        >
                          {meta.label}
                        </p>

                        {/* Status */}
                        <p
                          className="text-[10px] font-semibold"
                          style={{
                            color: isFull
                              ? "rgba(255,255,255,0.25)"
                              : active
                              ? meta.color
                              : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {isFull ? "Currently full" : active ? "Selected ✓" : "Tap to select"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── FORM ─────────────────────────────────────────────────── */}
            <form ref={formRef} onSubmit={handleSubmit}>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-white/35 mb-4">
                  2 — Your details
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="r-name"
                      className="text-xs uppercase tracking-wider text-white/40 mb-1.5 block"
                    >
                      Your name
                    </Label>
                    <Input
                      ref={nameRef}
                      id="r-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={80}
                      placeholder="e.g. Mwape Banda"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="r-phone"
                      className="text-xs uppercase tracking-wider text-white/40 mb-1.5 block"
                    >
                      WhatsApp number
                    </Label>
                    <Input
                      id="r-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+260 7XX XXX XXX"
                      required
                      maxLength={20}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </div>
              </div>

              {/* ── SUBMIT ─────────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={submitting || !serviceId}
                className="relative w-full overflow-hidden rounded-full py-4 font-bold text-white text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:  selectedMeta
                    ? `linear-gradient(135deg, ${selectedMeta.color}, ${selectedMeta.color}cc)`
                    : "linear-gradient(135deg, #E5192A, #c01020)",
                  boxShadow: selectedMeta && !submitting && serviceId
                    ? `0 0 40px -8px ${selectedMeta.glow}`
                    : "none",
                  transform: serviceId && !submitting ? "none" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!serviceId || submitting) return;
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.02) translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                {/* Shimmer */}
                {serviceId && !submitting && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
                      backgroundSize: "200% 100%",
                      animation: "reserve-shimmer 2s linear infinite",
                    }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Reserving your slot…</>
                  ) : !serviceId ? (
                    "Select a package above"
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /> Reserve my {selectedMeta?.label ?? ""} slot</>
                  )}
                </span>
              </button>

              {/* Micro reassurance */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
                {[
                  { icon: <Star     className="h-3 w-3" />, text: "Free to reserve"        },
                  { icon: <Lock     className="h-3 w-3" />, text: "No payment today"        },
                  { icon: <Tag      className="h-3 w-3" />, text: "Price locked at today's rate" },
                  { icon: <Clock    className="h-3 w-3" />, text: "Held for 30 days"        },
                ].map(({ icon, text }) => (
                  <span
                    key={text}
                    className="flex items-center gap-1.5 text-[11px] text-white/30"
                  >
                    <span className="text-white/20">{icon}</span>
                    {text}
                  </span>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* ── WHY RESERVE ──────────────────────────────────────────────── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: <Users  className="h-4 w-4" />,
              title: "You go first.",
              body:  "Reserve list members are contacted privately before we post anything publicly. First come, first served — for real.",
            },
            {
              icon: <Tag    className="h-4 w-4" />,
              title: "Your price is locked.",
              body:  "Prices can go up. Reserving today locks in your current rate — even if we raise prices before your slot opens.",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              title: "Zero risk.",
              body:  "Nothing is charged today. We only send you a payment request when a slot opens and you confirm you still want it.",
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border:     "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl mb-3"
                style={{
                  background: "rgba(229,25,42,0.10)",
                  border:     "1px solid rgba(229,25,42,0.20)",
                  color:      "#E5192A",
                }}
              >
                {icon}
              </span>
              <p className="font-display text-sm font-bold text-white mb-1">{title}</p>
              <p className="text-xs text-white/45 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

      </div>

      {/* ── Scoped keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes reserve-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,25,42,0.5); }
          50%       { box-shadow: 0 0 0 6px rgba(229,25,42,0); }
        }
        @keyframes reserve-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes reserve-fade-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes reserve-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
    }
