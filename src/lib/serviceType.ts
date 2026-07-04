// Classifies a service/order/subscription name into which profile
// inventory it draws from. Name-based, matching the same convention
// Pricing.tsx already uses (getDirectPrice) — so "Netflix (3 months)",
// "Prime Video", "All Access" etc. all classify correctly regardless of
// duration suffixes. Mirrors the SQL function
// public.classify_streaming_service() — keep both in sync if the naming
// convention for services ever changes.

export type ServiceType = "netflix" | "prime" | "all-access" | "other";

export function classifyService(name: string | null | undefined): ServiceType {
  const s = (name || "").toLowerCase();
  const hasNetflix = s.includes("netflix");
  const hasPrime   = s.includes("prime");
  const hasAll     = s.includes("all") || s.includes("bundle");
  if (hasAll || (hasNetflix && hasPrime)) return "all-access";
  if (hasNetflix) return "netflix";
  if (hasPrime)   return "prime";
  return "other";
}

export function needsNetflixProfile(type: ServiceType): boolean {
  return type === "netflix" || type === "all-access";
}

export function needsPrimeProfile(type: ServiceType): boolean {
  return type === "prime" || type === "all-access";
}

export function serviceTypeLabel(type: ServiceType): string {
  if (type === "netflix") return "Netflix";
  if (type === "prime") return "Prime Video";
  if (type === "all-access") return "All Access";
  return "Other";
}
