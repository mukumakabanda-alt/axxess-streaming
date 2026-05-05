import { supabase } from "@/integrations/supabase/client";

export const REWARD_TIERS: { points: number; label: string }[] = [
  { points: 5, label: "+2 days bonus" },
  { points: 15, label: "Loyalty Gold Badge" },
  { points: 30, label: "K5 off next subscription" },
  { points: 50, label: "Premium Bundle unlocked" },
  { points: 100, label: "Free month" },
];

/**
 * Records any newly crossed reward tiers so the admin gets notified
 * and the on-site popup can show "X unlocked!".
 * Returns the list of tiers that were just unlocked (i.e. crossed).
 */
export async function recordRewardUnlocks(
  phone: string,
  name: string | null,
  prevPoints: number,
  newPoints: number,
): Promise<{ points: number; label: string }[]> {
  if (!phone || newPoints <= prevPoints) return [];
  const crossed = REWARD_TIERS.filter((t) => prevPoints < t.points && newPoints >= t.points);
  if (!crossed.length) return [];

  // Insert one row per crossed tier; UNIQUE(phone, tier_points) prevents duplicates.
  const rows = crossed.map((t) => ({
    customer_phone: phone,
    customer_name: name,
    tier_points: t.points,
    tier_label: t.label,
  }));
  await supabase.from("reward_unlocks").insert(rows);
  return crossed;
}
