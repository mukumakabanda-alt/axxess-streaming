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

/**
 * Shared phone normalizer — the single source of truth for phone format
 * across the whole app (checkout, OneSignal login, DB storage, edge
 * functions). Always returns digits only, in international format with the
 * Zambia country code (260) and no leading "+", "0", or spaces/dashes.
 *
 * Examples:
 *   normalizePhone("0770 514 809")   -> "260770514809"
 *   normalizePhone("+260770514809")  -> "260770514809"
 *   normalizePhone("770-514-809")    -> "260770514809"
 *   normalizePhone("260770514809")   -> "260770514809"
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");

  if (digits.startsWith("260")) {
    // already has country code
  } else if (digits.startsWith("0")) {
    digits = "260" + digits.slice(1);
  } else if (digits.length === 9) {
    // local number without leading 0, e.g. "770514809"
    digits = "260" + digits;
  }

  return digits;
}

export type Network = "mtn" | "airtel" | "zamtel" | "unknown";

const MTN_PREFIXES = ["96", "76", "78"];
const AIRTEL_PREFIXES = ["97", "77", "95", "75", "57", "99"];
const ZAMTEL_PREFIXES = ["50", "51", "52"];

export function detectNetwork(raw: string): Network {
  const digits = normalizePhone(raw);
  const local = digits.startsWith("260") ? digits.slice(3) : digits;
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
