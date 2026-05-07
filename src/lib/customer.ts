// Customer memory — persists name, WhatsApp, join date, plan, renewal date in localStorage.
// Key shape: axxess_user = { name, whatsapp, joinedDate, plan?, renewalDate? }
// Also keeps legacy axx_customer_name / axx_customer_phone in sync for older callers.

const USER_KEY = "axxess_user";
const NAME_KEY = "axx_customer_name";
const PHONE_KEY = "axx_customer_phone";

export type AxxessUser = {
  name: string;
  whatsapp: string;
  joinedDate: string;
  plan?: string;
  renewalDate?: string;
};

export function getUser(): AxxessUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as AxxessUser;
    // Migrate from legacy keys
    const n = localStorage.getItem(NAME_KEY);
    const p = localStorage.getItem(PHONE_KEY);
    if (n || p) {
      const u: AxxessUser = { name: n ?? "", whatsapp: p ?? "", joinedDate: new Date().toISOString() };
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      return u;
    }
  } catch {}
  return null;
}

export function rememberCustomer(name?: string | null, phone?: string | null, plan?: string) {
  try {
    const cur = getUser();
    const u: AxxessUser = {
      name: (name?.trim() || cur?.name || ""),
      whatsapp: (phone?.trim() || cur?.whatsapp || ""),
      joinedDate: cur?.joinedDate || new Date().toISOString(),
      plan: plan || cur?.plan,
      renewalDate: cur?.renewalDate,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    if (u.name) localStorage.setItem(NAME_KEY, u.name);
    if (u.whatsapp) localStorage.setItem(PHONE_KEY, u.whatsapp);
  } catch {}
}

export function clearCustomer() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(PHONE_KEY);
  } catch {}
}

export function getRememberedName(): string {
  return getUser()?.name ?? "";
}

export function getRememberedPhone(): string {
  return getUser()?.whatsapp ?? "";
}

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] ?? "";
}

/** Owner helper exposed on window for setting test renewal dates. */
export function setRenewalDate(dateString: string) {
  const cur = getUser();
  if (!cur) return console.warn("No user saved yet");
  cur.renewalDate = new Date(dateString).toISOString();
  localStorage.setItem(USER_KEY, JSON.stringify(cur));
  return cur;
}

if (typeof window !== "undefined") {
  (window as any).setRenewalDate = setRenewalDate;
}
