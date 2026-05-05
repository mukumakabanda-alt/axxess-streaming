// Lightweight "remember me" helpers used across review/reserve/referral/order forms.
// We store name + phone locally so the site can greet returning visitors and pre-fill forms.

const NAME_KEY = "axx_customer_name";
const PHONE_KEY = "axx_customer_phone";

export function rememberCustomer(name?: string | null, phone?: string | null) {
  try {
    if (name && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    if (phone && phone.trim()) localStorage.setItem(PHONE_KEY, phone.trim());
  } catch {}
}

export function getRememberedName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

export function getRememberedPhone(): string {
  try { return localStorage.getItem(PHONE_KEY) ?? ""; } catch { return ""; }
}

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] ?? "";
}
