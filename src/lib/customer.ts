// Single source of truth for everything the site remembers about a visitor.
// Persists to localStorage permanently — survives page closes, refreshes,
// and browser restarts. Every input field on the site reads from here first
// so returning users never re-enter anything.
//
// Key: axxess_user (JSON object)
// Legacy keys axx_customer_name / axx_customer_phone kept in sync for any
// older code that still reads them directly.

const USER_KEY  = "axxess_user";
const NAME_KEY  = "axx_customer_name";
const PHONE_KEY = "axx_customer_phone";

export type AxxessUser = {
  name:           string;
  whatsapp:       string;
  joinedDate:     string;
  plan?:          string;       // last plan ordered, e.g. "Netflix"
  renewalDate?:   string;       // ISO string of subscription end date
  subscriptionId?: string;      // OneSignal subscription ID for this device
};

/* ─── Read ──────────────────────────────────────────────────────────────── */
export function getUser(): AxxessUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as AxxessUser;
    // Migrate from legacy keys so no returning customer loses their data
    const n = localStorage.getItem(NAME_KEY);
    const p = localStorage.getItem(PHONE_KEY);
    if (n || p) {
      const u: AxxessUser = {
        name:       n ?? "",
        whatsapp:   p ?? "",
        joinedDate: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      return u;
    }
  } catch {}
  return null;
}

/* ─── Write ─────────────────────────────────────────────────────────────── */
// Call this any time any piece of info is known. Pass only the fields you
// have — existing values are preserved for everything you don't pass.
export function rememberCustomer(
  name?:         string | null,
  phone?:        string | null,
  plan?:         string | null,
  renewalDate?:  string | null,  // ISO date string, e.g. "2026-07-25T00:00:00.000Z"
) {
  try {
    const cur = getUser();
    const u: AxxessUser = {
      name:          (name?.trim()  || cur?.name        || ""),
      whatsapp:      (phone?.trim() || cur?.whatsapp     || ""),
      joinedDate:    cur?.joinedDate || new Date().toISOString(),
      plan:          plan         ?? cur?.plan,
      renewalDate:   renewalDate  ?? cur?.renewalDate,
      subscriptionId: cur?.subscriptionId,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    if (u.name)     localStorage.setItem(NAME_KEY,  u.name);
    if (u.whatsapp) localStorage.setItem(PHONE_KEY, u.whatsapp);
  } catch {}
}

/* ─── Store OneSignal subscription ID for this device ───────────────────── */
export function rememberSubscriptionId(id: string) {
  try {
    const cur = getUser();
    if (!cur) return;
    cur.subscriptionId = id;
    localStorage.setItem(USER_KEY, JSON.stringify(cur));
  } catch {}
}

/* ─── Store renewal date after a successful order ───────────────────────── */
export function rememberRenewalDate(isoDate: string) {
  try {
    const cur = getUser();
    const u: AxxessUser = cur ?? {
      name: "", whatsapp: "", joinedDate: new Date().toISOString(),
    };
    u.renewalDate = isoDate;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {}
}

/* ─── Clear ─────────────────────────────────────────────────────────────── */
export function clearCustomer() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(PHONE_KEY);
  } catch {}
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
export function getRememberedName():  string { return getUser()?.name     ?? ""; }
export function getRememberedPhone(): string { return getUser()?.whatsapp ?? ""; }
export function getRememberedPlan():  string { return getUser()?.plan     ?? ""; }

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] ?? "";
}

/** Dev helper — callable from browser console: setRenewalDate("2026-07-01") */
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
