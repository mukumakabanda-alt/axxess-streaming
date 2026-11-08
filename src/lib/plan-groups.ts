export type PricingService = {
  id: string;
  name: string;
  slug: string;
  price_kwacha: number;
  billing_period?: string | null;
  description: string | null;
  features: string[];
  accent_color: string | null;
  badge: string | null;
  is_full: boolean | null;
};

export function isNetflixPlan(service: PricingService) {
  const name = `${service.slug} ${service.name}`.toLowerCase();
  return name.includes("netflix") && !/prime|bundle|all.?access/.test(name);
}

export function isNetflixLite(service: PricingService) {
  return /lite|light/i.test(`${service.slug} ${service.name}`);
}

// Group presentation only: never merge IDs, prices, or availability.
export function groupPricingServices(services: PricingService[]): PricingService[][] {
  const netflix = services.filter(isNetflixPlan);
  const groups: PricingService[][] = [];
  let addedNetflix = false;
  for (const service of services) {
    if (!isNetflixPlan(service)) {
      groups.push([service]);
    } else if (!addedNetflix) {
      groups.push([...netflix].sort((a, b) => Number(isNetflixLite(b)) - Number(isNetflixLite(a))));
      addedNetflix = true;
    }
  }
  return groups;
}

export function selectedNetflixPlan(options: PricingService[], selectedId: string | null) {
  return options.find((option) => option.id === selectedId)
    ?? options.find((option) => !isNetflixLite(option) && !option.is_full)
    ?? options.find((option) => !option.is_full)
    ?? options[0];
}