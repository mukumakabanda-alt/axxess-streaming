import { MessageCircle } from "lucide-react";
import { WHATSAPP_PRIMARY, waLink } from "@/lib/whatsapp";

export function WhatsAppFab() {
  return (
    <a
      href={waLink(WHATSAPP_PRIMARY, "Hi Axxess Streaming!")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-black shadow-glow-green animate-pulse-glow transition-smooth hover:scale-110"
      style={{ backgroundColor: "var(--color-spotify)" }}
    >
      <MessageCircle className="h-6 w-6" fill="currentColor" />
    </a>
  );
}
