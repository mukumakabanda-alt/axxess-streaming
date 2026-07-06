import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PointsRewards } from "@/components/site/PointsRewards";
import { Referral } from "@/components/site/Referral";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — Earn Points & Unlock Real Perks | Axxess" },
      { name: "description", content: "Every subscription earns you points. Unlock bonus days, discounts and a free month. Zambia's most rewarding streaming platform." },
      { property: "og:title", content: "Axxess Rewards — Stream more, earn more" },
      { property: "og:description", content: "Earn points every time you subscribe or refer a friend. Unlock real rewards including a free month of streaming." },
      { property: "og:url", content: "https://axxess-streaming.lovable.app/rewards" },
    ],
    links: [{ rel: "canonical", href: "https://axxess-streaming.lovable.app/rewards" }],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  return (
    <SiteShell>
      <PointsRewards />
      <Referral />
    </SiteShell>
  );
}
