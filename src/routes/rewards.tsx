import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PointsRewards } from "@/components/site/PointsRewards";
import { Referral } from "@/components/site/Referral";
import { Star } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — Earn Points & Unlock Perks | Axxess Streaming" },
      { name: "description", content: "Earn points every time you subscribe, refer a friend, or leave a review. Unlock bonuses, discounts, badges, and the exclusive Premium Bundle." },
      { property: "og:title", content: "Rewards — Axxess Streaming" },
      { property: "og:description", content: "Earn points and unlock streaming perks." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  return (
    <SiteShell>
      <PointsRewards />

      {/* Quick reach to leave a review (also earns points) */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border gradient-card p-6 text-center sm:p-8">
          <Star className="mx-auto h-7 w-7 text-primary" />
          <h3 className="mt-3 font-display text-xl font-bold">Leave a quick review</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your experience in 30 seconds and pocket <span className="font-semibold text-primary">+5 points</span>.
          </p>
          <Link to="/" hash="reviews" className="btn-primary-cta mt-5">
            Write a review
          </Link>
        </div>
      </section>

      <Referral />
    </SiteShell>
  );
}
