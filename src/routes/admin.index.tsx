import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap } from "lucide-react";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { TestimonialsTab } from "@/components/admin/TestimonialsTab";
import { UpdatesTab } from "@/components/admin/UpdatesTab";
import { ReferralsTab } from "@/components/admin/ReferralsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Axxess Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow-red">
              <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">Axxess Admin</p>
              <p className="text-[10px] text-muted-foreground">Private dashboard</p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            View site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your business in one place.</p>

        <Tabs defaultValue="overview" className="mt-6">
          <div className="relative -mx-4 sm:-mx-6">
            <div className="overflow-x-auto scrollbar-none px-4 sm:px-6">
              <TabsList className="inline-flex h-auto w-max min-w-full items-center gap-1 rounded-full bg-card p-1">
                <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Overview</TabsTrigger>
                <TabsTrigger value="orders" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Orders</TabsTrigger>
                <TabsTrigger value="subs" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Subscriptions</TabsTrigger>
                <TabsTrigger value="services" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Services</TabsTrigger>
                <TabsTrigger value="testimonials" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Testimonials</TabsTrigger>
                <TabsTrigger value="updates" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">News</TabsTrigger>
                <TabsTrigger value="referrals" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Referrals</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-full px-4 py-2 text-sm whitespace-nowrap">Settings</TabsTrigger>
              </TabsList>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent sm:w-8" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent sm:w-8" />
          </div>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="orders" className="mt-6"><OrdersTab /></TabsContent>
          <TabsContent value="subs" className="mt-6"><SubscriptionsTab /></TabsContent>
          <TabsContent value="services" className="mt-6"><ServicesTab /></TabsContent>
          <TabsContent value="testimonials" className="mt-6"><TestimonialsTab /></TabsContent>
          <TabsContent value="updates" className="mt-6"><UpdatesTab /></TabsContent>
          <TabsContent value="referrals" className="mt-6"><ReferralsTab /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
