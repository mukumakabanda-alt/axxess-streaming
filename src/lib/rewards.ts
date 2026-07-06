import { supabase } from "@/integrations/supabase/client";

export const REWARD_TIERS: {
  points: number;
  label: string;
  reward: string;
  emoji: string;
  color: string;
  glow: string;
  description: string;
}[] = [
  {
    points: 10,
    label: "2 Bonus Days",
    reward: "2 extra days added to your next subscription",
    emoji: "⚡",
    color: "#cd7f32",
    glow: "rgba(205,127,50,0.5)",
    description: "Your loyalty earns you 2 free extra days on your next renewal.",
  },
  {
    points: 25,
    label: "K5 Off",
    reward: "K5 off your next purchase",
    emoji: "💰",
    color: "#a8a9ad",
    glow: "rgba(168,169,173,0.5)",
    description: "K5 discount automatically applied to your next order. Just mention this when ordering.",
  },
  {
    points: 50,
    label: "5 Bonus Days",
    reward: "5 extra days on your next subscription",
    emoji: "🎯",
    color: "#C9A84C",
    glow: "rgba(201,168,76,0.6)",
    description: "5 bonus days added to your next renewal. More streaming, same price.",
  },
  {
    points: 75,
    label: "K15 Off",
    reward: "K15 off your next purchase",
    emoji: "🔥",
    color: "#e5e4e2",
    glow: "rgba(229,228,226,0.5)",
    description: "K15 off your next subscription. That's basically a week free.",
  },
  {
    points: 100,
    label: "Free Month",
    reward: "One full month FREE",
    emoji: "👑",
    color: "#E5192A",
    glow: "rgba(229,25,42,0.7)",
    description: "A full free month of streaming. No payment needed. You earned it.",
  },
];

export async function recordRewardUnlocks(
  phone: string,
  name: string | null,
  prevPoints: number,
  newPoints: number,
): Promise<{ points: number; label: string; emoji: string }[]> {
  if (!phone || newPoints <= prevPoints) return [];
  const crossed = REWARD_TIERS.filter((t) => prevPoints < t.points && newPoints >= t.points);
  if (!crossed.length) return [];
  await Promise.all(
    crossed.map((t) =>
      supabase.rpc("record_reward_unlock", {
        _phone: phone,
        _name: name ?? "",
        _tier_points: t.points,
        _tier_label: t.label,
      }),
    ),
  );
  return crossed.map((t) => ({ points: t.points, label: t.label, emoji: t.emoji }));
  }
