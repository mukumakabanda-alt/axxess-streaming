/**
 * Live site configuration — the single source of truth for the WhatsApp
 * number, the WhatsApp community link and the mobile-money payment details.
 *
 * Values are edited in Admin → Settings (table `site_settings`) and read
 * everywhere through `useSiteConfig()`. The constants in `@/lib/whatsapp`
 * are only the fallbacks used before the settings load (and during SSR).
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  WHATSAPP_PRIMARY,
  MTN_PAYMENT_NUMBER,
  MTN_PAYMENT_NAME,
  AIRTEL_PAYMENT_NUMBER,
  AIRTEL_PAYMENT_NAME,
  normalizePhone,
  type Network,
} from "@/lib/whatsapp";

export const CONFIG_KEYS = [
  "whatsapp_number",
  "whatsapp_group_link",
  "mtn_payment_number",
  "mtn_payment_name",
  "airtel_payment_number",
  "airtel_payment_name",
] as const;

export type SiteConfig = {
  /** International digits, no "+", e.g. 260574161927 */
  whatsappNumber: string;
  whatsappGroupLink: string;
  mtnNumber: string;
  mtnName: string;
  airtelNumber: string;
  airtelName: string;
};

export const CONFIG_DEFAULTS: SiteConfig = {
  whatsappNumber: WHATSAPP_PRIMARY,
  whatsappGroupLink: "",
  mtnNumber: MTN_PAYMENT_NUMBER,
  mtnName: MTN_PAYMENT_NAME,
  airtelNumber: AIRTEL_PAYMENT_NUMBER,
  airtelName: AIRTEL_PAYMENT_NAME,
};

let snapshot: SiteConfig = CONFIG_DEFAULTS;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function rowsToConfig(rows: { key: string; value: string | null }[]): SiteConfig {
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    if (r.value !== null && r.value !== "") map[r.key] = r.value;
  });
  return {
    whatsappNumber: map.whatsapp_number
      ? normalizePhone(map.whatsapp_number)
      : CONFIG_DEFAULTS.whatsappNumber,
    whatsappGroupLink: map.whatsapp_group_link ?? CONFIG_DEFAULTS.whatsappGroupLink,
    mtnNumber: map.mtn_payment_number ?? CONFIG_DEFAULTS.mtnNumber,
    mtnName: map.mtn_payment_name ?? CONFIG_DEFAULTS.mtnName,
    airtelNumber: map.airtel_payment_number ?? CONFIG_DEFAULTS.airtelNumber,
    airtelName: map.airtel_payment_name ?? CONFIG_DEFAULTS.airtelName,
  };
}

/** Pushes freshly saved settings into every mounted component immediately. */
export function setSiteConfig(next: SiteConfig) {
  snapshot = next;
  loaded = true;
  emit();
}

export function loadSiteConfig(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!force && (loaded || inflight)) return inflight ?? Promise.resolve();
  inflight = supabase
    .from("site_settings")
    .select("key,value")
    .in("key", CONFIG_KEYS as unknown as string[])
    .then(({ data }) => {
      snapshot = rowsToConfig((data ?? []) as any);
      loaded = true;
      emit();
    })
    .then(
      () => { inflight = null; },
      () => { inflight = null; },
    ) as Promise<void>;
  return inflight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void loadSiteConfig();
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => CONFIG_DEFAULTS;

export function useSiteConfig(): SiteConfig {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Payment details for a detected network (Zamtel routes to MTN, per spec). */
export function paymentDetails(network: Network, cfg: SiteConfig) {
  if (network === "airtel") {
    return { label: "Airtel Money", number: cfg.airtelNumber, name: cfg.airtelName, tone: "airtel" as const };
  }
  if (network === "mtn" || network === "zamtel") {
    return { label: "MTN Mobile Money", number: cfg.mtnNumber, name: cfg.mtnName, tone: "mtn" as const };
  }
  return null;
}
