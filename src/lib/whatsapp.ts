export const WHATSAPP_PRIMARY = "260765101494";
export const WHATSAPP_SECONDARY = "260762073206";

export function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function orderMessage(serviceName: string, price: number) {
  return `Hi Axxess Streaming! 👋\n\nI'd like to order: *${serviceName}* (K${price}/month).\n\nPlease share payment details. Thank you!`;
}
