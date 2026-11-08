import { test } from "node:test";
import { strict as assert } from "node:assert";
import { groupPricingServices, selectedNetflixPlan, type PricingService } from "./plan-groups";

const base = { description: null, features: [], accent_color: null, badge: null, is_full: false };
const lite: PricingService = { ...base, id: "lite-id", name: "Netflix Lite", slug: "netflix-lite", price_kwacha: 40, billing_period: "15 days" };
const personal: PricingService = { ...base, id: "personal-id", name: "Netflix Personal", slug: "netflix", price_kwacha: 90, billing_period: "month" };
const prime: PricingService = { ...base, id: "prime-id", name: "Prime Video", slug: "prime", price_kwacha: 60 };
const both: PricingService = { ...base, id: "both-id", name: "Netflix + Prime Video", slug: "all-access", price_kwacha: 140 };

test("Netflix is grouped once while Prime and Both remain distinct", () => {
  assert.deepEqual(groupPricingServices([personal, prime, lite, both]).map((group) => group.map((s) => s.id)), [["lite-id", "personal-id"], ["prime-id"], ["both-id"]]);
});
test("Lite selection preserves its K40, 15-day service", () => {
  assert.equal(selectedNetflixPlan([lite, personal], "lite-id"), lite);
  assert.equal(selectedNetflixPlan([lite, personal], "lite-id")?.price_kwacha, 40);
  assert.equal(selectedNetflixPlan([lite, personal], "lite-id")?.billing_period, "15 days");
});
test("Personal selection preserves its K90 service", () => {
  assert.equal(selectedNetflixPlan([lite, personal], "personal-id"), personal);
  assert.equal(selectedNetflixPlan([lite, personal], "personal-id")?.price_kwacha, 90);
});
test("One full Netflix option does not mark the other full", () => {
  const fullLite = { ...lite, is_full: true };
  assert.equal(selectedNetflixPlan([fullLite, personal], "lite-id")?.is_full, true);
  assert.equal(selectedNetflixPlan([fullLite, personal], "personal-id")?.is_full, false);
});