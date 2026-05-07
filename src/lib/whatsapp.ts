// Single source of truth for WhatsApp & payment numbers.
export const WHATSAPP_PRIMARY = "260770514809";
export const WHATSAPP_SECONDARY = "260762073206";
export const MTN_PAYMENT_NUMBER = "0765101494";
export const MTN_PAYMENT_NAME = "Stanley Kabanda";
export const AIRTEL_PAYMENT_NUMBER = "0574161927";
export const AIRTEL_PAYMENT_NAME = "Ngoma Audrian";

export function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function orderMessage(serviceName: string, price: number) {
  return `Hi Axxess Streaming! 👋\n\nI'd like to order: *${serviceName}* (K${price}/month).\n\nPlease share payment details. Thank you!`;
}

export type Network = "mtn" | "airtel" | "zamtel" | "unknown";

const MTN_PREFIXES = ["96", "76", "78"];
const AIRTEL_PREFIXES = ["97", "77", "95", "75", "57", "99"];
const ZAMTEL_PREFIXES = ["50", "51", "52"];

export function detectNetwork(raw: string): Network {
  const digits = (raw || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("260")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  const prefix = local.slice(0, 2);
  if (MTN_PREFIXES.includes(prefix)) return "mtn";
  if (AIRTEL_PREFIXES.includes(prefix)) return "airtel";
  if (ZAMTEL_PREFIXES.includes(prefix)) return "zamtel";
  return "unknown";
}

/** Inline payment instruction for a network (Zamtel routes to MTN per spec). */
export function paymentInstruction(network: Network) {
  if (network === "airtel") {
    return {
      label: "Airtel Money",
      number: AIRTEL_PAYMENT_NUMBER,
      name: AIRTEL_PAYMENT_NAME,
      tone: "airtel" as const,
    };
  }
  if (network === "mtn" || network === "zamtel") {
    return {
      label: "MTN Mobile Money",
      number: MTN_PAYMENT_NUMBER,
      name: MTN_PAYMENT_NAME,
      tone: "mtn" as const,
    };
  }
  return null;
}
