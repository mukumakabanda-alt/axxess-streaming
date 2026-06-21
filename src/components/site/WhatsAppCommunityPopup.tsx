import { useEffect, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

const POPUP_KEY = "axx_wa_community_popup_v1";
const WA_COMMUNITY_LINK = "https://chat.whatsapp.com/GS48ieAaKkUHtRIHp0YVv8?s=sw&p=a&mlu=3";

export function WhatsAppCommunityPopup() {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const seen = sessionStorage.getItem(POPUP_KEY);
    if (seen) return;

    const timer = setTimeout(() => {
      const alreadySeen = sessionStorage.getItem(POPUP_KEY);
      if (alreadySeen) return;
      setShow(true);
      setVisible(true);
    }, 20000);

    const onCheckoutPay = () => {
      const alreadySeen = sessionStorage.getItem(POPUP_KEY);
      if (alreadySeen) return;
      clearTimeout(timer);
      setShow(true);
      setVisible(true);
    };
    window.addEventListener("axx:checkout-pay-step", onCheckoutPay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("axx:checkout-pay-step", onCheckoutPay);
    };
  }, [pathname]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(POPUP_KEY, "1");
    setTimeout(() => setShow(false), 400);
  };

  const join = () => {
    sessionStorage.setItem(POPUP_KEY, "1");
    window.open(WA_COMMUNITY_LINK, "_blank");
    setVisible(false);
    setTimeout(() => setShow(false), 400);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(12,12,12,0.95)",
          border: "1px solid rgba(37,211,102,0.3)",
          borderRadius: 16,
          backdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 2, background: "linear-gradient(90deg, #25D366, #128C7E)" }} />

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)" }}
              >
                <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} />
              </div>
              <span
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#25D366" }}
              >
                Join the community
              </span>
            </div>
            <button
              onClick={dismiss}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3 text-white/60" />
            </button>
          </div>

          <p className="font-semibold leading-snug mb-1" style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.4 }}>
            Join the Axxess WhatsApp Community
          </p>
          <p className="mb-3" style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
            Get instant deal alerts, renewal reminders, and connect with other subscribers — straight on WhatsApp.
          </p>

          <button
            onClick={join}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all hover:opacity-90 w-full justify-center"
            style={{ background: "#25D366", color: "#000" }}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Join Community
          </button>
        </div>
      </div>
    </div>
  );
}
